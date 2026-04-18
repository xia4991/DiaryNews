import { useState } from 'react'
import ListingForm from './ListingForm'
import ImageUploader from './ImageUploader'
import Field from '../ui/Field'
import { SH_CATEGORIES, CATEGORY_ZH, SH_CONDITIONS, CONDITION_ZH } from '../../constants/secondhand'

export default function SecondHandFormModal({ listing, onSave, onClose }) {
  const isEdit = Boolean(listing)
  const [images, setImages] = useState(listing?.images || [])

  const handleSave = async (payload) => {
    await onSave({
      ...payload,
      price_cents: parseInt(payload.price_cents, 10) || 0,
      image_keys: isEdit ? undefined : images,
    })
  }

  return (
    <ListingForm
      title={isEdit ? '编辑二手' : '发布二手'}
      initial={{
        title:            listing?.title            ?? '',
        category:         listing?.category         ?? 'Other',
        condition:        listing?.condition         ?? 'good',
        price_cents:      listing?.price_cents      ?? '',
        location:         listing?.location         ?? '',
        description:      listing?.description      ?? '',
        contact_phone:    listing?.contact_phone    ?? '',
        contact_whatsapp: listing?.contact_whatsapp ?? '',
        contact_email:    listing?.contact_email    ?? '',
      }}
      onSave={handleSave}
      onClose={onClose}
    >
      {({ form, set }) => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="分类" required>
              <select id="sh-category" value={form.category} onChange={set('category')}>
                {SH_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ZH[c]}</option>)}
              </select>
            </Field>
            <Field label="成色" required>
              <select id="sh-condition" value={form.condition} onChange={set('condition')}>
                {SH_CONDITIONS.map(c => <option key={c} value={c}>{CONDITION_ZH[c]}</option>)}
              </select>
            </Field>
          </div>

          <Field label="价格 (欧分)" required>
            <input
              id="sh-price"
              type="number"
              min="0"
              value={form.price_cents}
              onChange={set('price_cents')}
              placeholder="例如 5000 = €50"
            />
          </Field>

          {!isEdit && (
            <ImageUploader images={images} onChange={setImages} />
          )}
        </>
      )}
    </ListingForm>
  )
}
