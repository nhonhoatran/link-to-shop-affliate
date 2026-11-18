import { collectionInputSchema, outfitInputSchema, type ImportCommitContent } from '@under30ss/shared';
import type { AppContext } from '../lib/app-context';
import { badRequest, conflict } from '../lib/app-error';
import { CollectionModel } from '../models/collection-model';
import { OutfitModel } from '../models/outfit-model';
import { ImportMediaModel, type ImportMediaRecord } from '../models/import-media-model';
import { ImportOperationModel, type ImportOperationRecord } from '../models/import-operation-model';
import { createCollection } from './collection-service';
import { createOutfit } from './outfit-service';

export const buildImportEntityInputs = async (record: Pick<ImportOperationRecord, 'sessionId' | 'collectionId'>, input: ImportCommitContent) => {
  const ids = [...new Set([input.collection.coverMediaId, input.outfit.modelMediaId, ...input.outfit.items.map((item) => item.mediaId)])];
  const media = await ImportMediaModel.find({ sessionId: record.sessionId, clientMediaId: { $in: ids }, status: 'ready' }).lean<ImportMediaRecord[]>();
  const byId = new Map(media.map((item) => [item.clientMediaId, item]));
  const imageFor = (id: string, kind?: 'model' | 'item') => {
    const item = byId.get(id);
    if (!item?.image || (kind && kind !== item.kind)) {
      throw badRequest('Ảnh chưa được tải trong phiên này hoặc không đúng loại', { mediaId: id });
    }
    return item.image;
  };
  const { coverMediaId, ...collectionFields } = input.collection;
  const { modelMediaId, items, ...outfitFields } = input.outfit;
  return {
    collection: collectionInputSchema.parse({ ...collectionFields, status: 'draft', coverImage: imageFor(coverMediaId) }),
    outfit: outfitInputSchema.parse({
      ...outfitFields, status: 'draft', featured: false, showArrows: false,
      modelImage: imageFor(modelMediaId, 'model'), collectionIds: [String(record.collectionId)],
      items: items.map(({ mediaId, ...item }) => ({ ...item, image: imageFor(mediaId, 'item') })),
    }),
  };
};

const markCreated = async (record: ImportOperationRecord, field: 'collectionCreated' | 'outfitCreated', ctx: AppContext): Promise<void> => {
  const result = await ImportOperationModel.updateOne(
    { _id: record._id, leaseOwner: record.leaseOwner },
    { $set: { [field]: true, leaseUntil: new Date(Date.now() + ctx.env.IMPORT_LEASE_MS) } },
  );
  if (result.matchedCount !== 1) throw conflict('Một yêu cầu khác đang phục hồi mục này; kiểm tra phiên trước khi thử lại');
};

const markWriteStarted = async (record: ImportOperationRecord, ctx: AppContext): Promise<void> => {
  const result = await ImportOperationModel.updateOne(
    { _id: record._id, leaseOwner: record.leaseOwner, status: 'processing' },
    { $set: { writeStarted: true, leaseUntil: new Date(Date.now() + ctx.env.IMPORT_LEASE_MS) } },
  );
  if (result.matchedCount !== 1) throw conflict('Quyền xử lý đã chuyển sang yêu cầu khác; kiểm tra lại phiên');
};

export const createImportEntities = async (ctx: AppContext, record: ImportOperationRecord, input: ImportCommitContent): Promise<void> => {
  // Validate every media reference before creating either entity.
  const parsed = await buildImportEntityInputs(record, input);
  const reference = String(record._id);
  const identity = (id: string) => ({ id, importReference: reference });
  const findCollection = () => CollectionModel.findById(record.collectionId).select('+importReference').lean();
  const findOutfit = () => OutfitModel.findById(record.outfitId).select('+importReference').lean();
  let [collection, outfit] = await Promise.all([findCollection(), findOutfit()]);
  // Check both slugs before either create, so ordinary conflicts leave no partial collection.
  const [collectionTaken, outfitTaken] = await Promise.all([
    collection ? false : CollectionModel.exists({ slug: parsed.collection.slug }),
    outfit ? false : OutfitModel.exists({ slug: parsed.outfit.slug }),
  ]);
  if (collectionTaken) throw conflict('Slug bộ sưu tập đã được dùng', { 'collection.slug': 'Chọn slug bộ sưu tập khác' });
  if (outfitTaken) throw conflict('Slug outfit đã được dùng', { 'outfit.slug': 'Chọn slug outfit khác' });
  // This flag never resets: a worker whose lease expired may still have an entity write in flight.
  await markWriteStarted(record, ctx);
  if (!collection) {
    if (record.collectionCreated) throw conflict('Bộ sưu tập của mục nhập đã bị xoá; không tự tạo lại');
    try {
      await createCollection(parsed.collection, ctx.env, identity(String(record.collectionId)));
    } catch (error) {
      // A lease can expire while a request is running; the fixed identity fences duplicate creates.
      if ((await findCollection())?.importReference !== reference) throw error;
    }
    collection = await findCollection();
  }
  if (collection?.importReference !== reference) throw conflict('Danh tính bộ sưu tập không khớp phiên nhập');
  await markCreated(record, 'collectionCreated', ctx);
  if (!outfit) {
    if (record.outfitCreated) throw conflict('Outfit của mục nhập đã bị xoá; không tự tạo lại');
    try {
      await createOutfit(parsed.outfit, identity(String(record.outfitId)));
    } catch (error) {
      if ((await findOutfit())?.importReference !== reference) throw error;
    }
    outfit = await findOutfit();
  }
  if (outfit?.importReference !== reference) throw conflict('Danh tính outfit không khớp phiên nhập');
  await markCreated(record, 'outfitCreated', ctx);
};
