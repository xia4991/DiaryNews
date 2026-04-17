import { useState } from 'react'
import ListingForm from './ListingForm'
import ImageUploader from './ImageUploader'
import Field from '../ui/Field'
import { DEAL_TYPES, DEAL_TYPE_ZH } from '../../constants/realestate'

export default function RealEstateFormModal({ listing, onSave, onClose }) {
  const isEdit = Boolean(listing)
  const [images, setImages] = useState(listing?.images || [])

  const handleSave = async (payload) => {
    await onSave({
      ...payload,
      price_cents: parseInt(payload.price_cents, 10) || 0,
      rooms: payload.rooms ? parseInt(payload.rooms, 10) : null,
      bathrooms: payload.bathrooms ? parseInt(payload.bathrooms, 10) : null,
      area_m2: payload.area_m2 ? parseInt(payload.area_m2, 10) : null,
      furnished: Boolean(payload.furnished),
      image_keys: isEdit ? undefined : images,
    })
  }

  return (
    <ListingForm
      title={isEdit ? '编辑房产' : '发布房产'}
      initial={{
        title:            listing?.title            ?? '',
        deal_type:        listing?.deal_type        ?? 'rent',
        price_cents:      listing?.price_cents      ?? '',
        rooms:            listing?.rooms            ?? '',
        bathrooms:        listing?.bathrooms        ?? '',
        area_m2:          listing?.area_m2          ?? '',
        furnished:        listing?.furnished        ?? false,
        location:         listing?.location         ?? '',
        description:      listing?.description      ?? '',
        contact_phone:    listing?.contact_phone    ?? '',
        contact_whatsapp: listing?.contact_whatsapp ?? '',
        contact_email:    listing?.contact_email    ?? '',
      }}
      onSave={handleSave}
      onClose={onClose}
    >
      {({ form, set, patch }) => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="类型" required>
              <select id="re-deal-type" value={form.deal_type} onChange={set('deal_type')}>
                {DEAL_TYPES.map(t => <option key={t} value={t}>{DEAL_TYPE_ZH[t]}</option>)}
              </select>
            </Field>
            <Field label="价格 (欧分)" required>
              <input
                id="re-price"
                type="number"
                min="0"
                value={form.price_cents}
                onChange={set('price_cents')}
                placeholder="例如 120000 = €1,200"
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="房间数">
              <input id="re-rooms" type="number" min="0" value={form.rooms} onChange={set('rooms')} placeholder="T2" />
            </Field>
            <Field label="卫生间">
              <input id="re-bathrooms" type="number" min="0" value={form.bathrooms} onChange={set('bathrooms')} />
            </Field>
            <Field label="面积 m²">
              <input id="re-area" type="number" min="0" value={form.area_m2} onChange={set('area_m2')} />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={form.furnished || false}
              onChange={(e) => patch({ furnished: e.target.checked })}
              className="rounded border-border-strong"
            />
            带家具
          </label>

          {!isEdit && (
            <ImageUploader images={images} onChange={setImages} />
          )}
        </>
      )}
    </ListingForm>
  )
}
