import Field from '../ui/Field'

export default function ContactFields({ values, onChange, error }) {
  const set = (key) => (e) => onChange({ ...values, [key]: e.target.value })

  return (
    <div className="flex flex-col gap-2">
      <Field label="联系方式" required error={error}>
        <input
          id="contact-phone"
          value={values.contact_phone || ''}
          onChange={set('contact_phone')}
          placeholder="电话"
        />
      </Field>
      <input
        value={values.contact_whatsapp || ''}
        onChange={set('contact_whatsapp')}
        placeholder="WhatsApp"
        className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-accent"
      />
      <input
        type="email"
        value={values.contact_email || ''}
        onChange={set('contact_email')}
        placeholder="邮箱"
        className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-accent"
      />
    </div>
  )
}
