// 完全なMongooseモック実装
const mongoose = {
  connect: jest.fn().mockResolvedValue(true),
  connection: {
    readyState: 1,
    on: jest.fn(),
    once: jest.fn(),
    db: {
      admin: jest.fn().mockReturnValue({
        ping: jest.fn().mockResolvedValue({ ok: 1 })
      })
    }
  },
  models: {},
  model: jest.fn((name, schema) => {
    // 動的モデル生成
    const Model = class {
      constructor(data) {
        Object.assign(this, data);
        this._id = data._id || Math.random().toString(36).substr(2, 9);
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
      }
      
      save = jest.fn().mockResolvedValue(this);
      validate = jest.fn().mockResolvedValue(undefined);
      toJSON = jest.fn().mockReturnValue({
        _id: this._id,
        content: this.content,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      });
    };
    
    // 静的メソッド
    Model.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        {
          _id: '1',
          content: 'Test post 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: '2',
          content: 'Test post 2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    });
    
    Model.findById = jest.fn().mockImplementation((id) => {
      if (id === '507f1f77bcf86cd799439011') {
        return Promise.resolve({
          _id: id,
          content: 'Test post content',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      return Promise.resolve(null);
    });
    
    Model.findByIdAndUpdate = jest.fn().mockImplementation((id, update, options) => {
      if (id === '507f1f77bcf86cd799439011') {
        return Promise.resolve({
          _id: id,
          content: update.content || 'Updated content',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      return Promise.resolve(null);
    });
    
    Model.findByIdAndDelete = jest.fn().mockImplementation((id) => {
      if (id === '507f1f77bcf86cd799439011') {
        return Promise.resolve({
          _id: id,
          content: 'Deleted post',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      return Promise.resolve(null);
    });
    
    Model.create = jest.fn().mockImplementation((data) => {
      const instance = new Model(data);
      return Promise.resolve(instance);
    });
    
    Model.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
    Model.countDocuments = jest.fn().mockResolvedValue(2);
    
    // モデルをキャッシュに保存
    mongoose.models[name] = Model;
    
    return Model;
  }),
  Schema: class Schema {
    constructor(definition, options) {
      this.definition = definition;
      this.options = options;
      this.methods = {};
      this.statics = {};
      this.virtual = jest.fn().mockReturnValue({ get: jest.fn(), set: jest.fn() });
      this.pre = jest.fn();
      this.post = jest.fn();
      this.plugin = jest.fn();
      this.index = jest.fn();
    }
  },
  Document: class Document {},
  Model: class Model {},
  Types: {
    ObjectId: class ObjectId {
      constructor(id) {
        this.id = id || Math.random().toString(36).substr(2, 9);
      }
      toString() {
        return this.id;
      }
      static isValid() {
        return true;
      }
    }
  }
};

// ESモジュール対応
module.exports = mongoose;
module.exports.default = mongoose;
module.exports.Schema = mongoose.Schema;
module.exports.Document = mongoose.Document;
module.exports.Model = mongoose.Model;
module.exports.models = mongoose.models;
module.exports.Types = mongoose.Types;