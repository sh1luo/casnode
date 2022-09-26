import React from "react";
import {Button, Popconfirm, Table} from 'antd';
import {DeleteOutlined, DownloadOutlined, FileDoneOutlined} from "@ant-design/icons";
import * as Setting from "./Setting";
import i18next from "i18next";
import * as PermissionUtil from "./PermissionUtil";
import * as FileBackend from "./backend/FileBackend";

class FileTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      classes: props,
    };
  }

  updateTable(table) {
    this.props.onUpdateTable(table);
  }

  parseField(key, value) {
    if (key === "data") {
      value = Setting.trim(value, ",");
      return value.split(",").map(i => Setting.myParseInt(i));
    }

    if ([].includes(key)) {
      value = Setting.myParseInt(value);
    }
    return value;
  }

  updateField(table, index, key, value) {
    value = this.parseField(key, value);

    table[index][key] = value;
    this.updateTable(table);
  }

  addRow(table) {
    let row = {no: table.length, name: `New Vector - ${table.length}`, data: []};
    if (table === undefined) {
      table = [];
    }
    table = Setting.addRow(table, row);
    this.updateTable(table);
  }

  deleteRow(table, i) {
    table = Setting.deleteRow(table, i);
    this.updateTable(table);
  }

  upRow(table, i) {
    table = Setting.swapRow(table, i - 1, i);
    this.updateTable(table);
  }

  downRow(table, i) {
    table = Setting.swapRow(table, i, i + 1);
    this.updateTable(table);
  }

  deleteFile(file, isLeaf) {
    const storeId = `${this.props.store.owner}/${this.props.store.name}`;
    FileBackend.deleteFile(storeId, file.key, isLeaf)
      .then((res) => {
        if (res === true) {
          Setting.showMessage("success", `File deleted successfully`);
          window.location.reload();
        } else {
          Setting.showMessage("error", `File failed to delete: ${res}`);
        }
      })
      .catch(error => {
        Setting.showMessage("error", `File failed to delete: ${error}`);
      });
  }

  renderTable(table) {
    const columns = [
      {
        title: i18next.t("vectorset:File name"),
        dataIndex: 'title',
        key: 'title',
        // width: '200px',
        sorter: (a, b) => a.title.localeCompare(b.title),
        render: (text, record, index) => {
          return text;
        }
      },
      {
        title: i18next.t("store:Category"),
        dataIndex: 'isLeaf',
        key: 'isLeaf',
        width: '90px',
        sorter: (a, b) => a.isLeaf - b.isLeaf,
        render: (text, record, index) => {
          if (text) {
            return i18next.t("store:File");
          } else {
            return i18next.t("store:Folder");
          }
        }
      },
      {
        title: i18next.t("store:File type"),
        dataIndex: 'fileType',
        key: 'fileType',
        width: '120px',
        sorter: (a, b) => Setting.getExtFromPath(a.title).localeCompare(Setting.getExtFromPath(b.title)),
        render: (text, record, index) => {
          return record.title.split('.')[1];
        }
      },
      {
        title: i18next.t("vectorset:File size"),
        dataIndex: 'size',
        key: 'size',
        width: '120px',
        sorter: (a, b) => a.size - b.size,
        render: (text, record, index) => {
          if (!record.isLeaf) {
            return null;
          }

          return Setting.getFriendlyFileSize(text);
        }
      },
      {
        title: i18next.t("general:Created time"),
        dataIndex: 'createdTime',
        key: 'createdTime',
        width: '160px',
        sorter: (a, b) => a.createdTime.localeCompare(b.createdTime),
        render: (text, record, index) => {
          return Setting.getFormattedDate(text);
        }
      },
      {
        title: i18next.t("store:Collected time"),
        dataIndex: 'collectedTime',
        key: 'collectedTime',
        width: '160px',
        sorter: (a, b) => a.collectedTime.localeCompare(b.collectedTime),
        render: (text, record, index) => {
          const collectedTime = Setting.getCollectedTime(record.title);
          return Setting.getFormattedDate(collectedTime);
        }
      },
      {
        title: i18next.t("store:Subject"),
        dataIndex: 'subject',
        key: 'subject',
        width: '90px',
        sorter: (a, b) => a.subject.localeCompare(b.subject),
        render: (text, record, index) => {
          return Setting.getSubject(record.title);
        }
      },
      // {
      //   title: i18next.t("store:Path"),
      //   dataIndex: 'key',
      //   key: 'key',
      //   width: '100px',
      //   sorter: (a, b) => a.key.localeCompare(b.key),
      // },
    ];

    return (
      <Table rowKey="title" columns={columns} dataSource={table} size="middle" bordered pagination={false} title={() => {
        if (!this.props.isCheckMode) {
          return null;
        } else {
          const files = this.props.file.children;
          const fileCount = files.filter(file => file.isLeaf).length;
          const folderCount = files.filter(file => !file.isLeaf).length;
          const text = `${fileCount} ` + i18next.t("store:files and") +
            ` ${folderCount} ` + i18next.t("store:folders are checked");
          return (
            <div>
              {text}
              <Button icon={<DownloadOutlined />} style={{marginLeft: "20px", marginRight: "10px"}} type="primary" size="small" onClick={() => {
                files.filter(file => file.isLeaf).forEach((file, index) => {
                  const url = `${this.props.store.domain}/${file.key}`;
                  Setting.openLink(url);
                });
              }}>{i18next.t("store:Download")}</Button>
              <Popconfirm
                title={`Sure to delete all ${fileCount} files and ${folderCount} folders ?`}
                onConfirm={(e) => {
                  files.forEach((file, index) => {
                    this.deleteFile(file, file.isLeaf);
                  });
                }}
                okText="OK"
                cancelText="Cancel"
              >
                <Button icon={<DeleteOutlined />} style={{marginRight: "10px"}} type="primary" danger size="small">{i18next.t("store:Delete")}</Button>
              </Popconfirm>
              <Button icon={<FileDoneOutlined />} size="small" onClick={() => {
                let fileKeys = [];
                files.forEach((file, index) => {
                  fileKeys.push(file.key);
                });
                PermissionUtil.addPermission(this.props.account, this.props.store, null, fileKeys);
              }}>{i18next.t("store:Add Permission")}</Button>
            </div>
          )
        }
      }} />
    );
  }

  render() {
    return (
      <div>
        {
          this.renderTable(this.props.file.children)
        }
      </div>
    )
  }
}

export default FileTable;
