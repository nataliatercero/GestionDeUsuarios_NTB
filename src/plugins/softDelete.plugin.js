export const softDeletePlugin = (schema) => {
  schema.add({
    deleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null }
  });

  const excludeDeleted = function() {
    if (!this.getOptions().withDeleted) {
      this.where({ deleted: { $ne: true } });
    }
  };

  schema.pre('find', excludeDeleted);
  schema.pre('findOne', excludeDeleted);
  schema.pre('findOneAndUpdate', excludeDeleted);
  schema.pre('countDocuments', excludeDeleted);

  schema.statics.softDeleteById = async function(id, deletedBy = null) {
    return this.findByIdAndUpdate(
      id,
      {
        deleted: true,
        deletedAt: new Date(),
        deletedBy
      },
      { new: true }
    ).setOptions({ withDeleted: true });
  };

  schema.statics.restoreById = async function(id) {
    return this.findByIdAndUpdate(
      id,
      {
        deleted: false,
        deletedAt: null,
        deletedBy: null
      },
      { new: true }
    ).setOptions({ withDeleted: true });
  };

  schema.statics.findDeleted = function(filter = {}) {
    return this.find({ ...filter, deleted: true }).setOptions({ withDeleted: true });
  };

  schema.statics.hardDelete = function(id) {
    return this.findByIdAndDelete(id).setOptions({ withDeleted: true });
  };

  const existing = schema.get('toJSON') || {};
  const existingTransform = existing.transform;
  schema.set('toJSON', {
    ...existing,
    transform: (doc, ret, options) => {
      const result = existingTransform ? existingTransform(doc, ret, options) : ret;
      delete result.deleted;
      delete result.deletedAt;
      delete result.deletedBy;
      delete result.id;
      return result;
    },
  });
};
