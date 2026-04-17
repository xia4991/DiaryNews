import ListingForm from './ListingForm'
import Field from '../ui/Field'
import { JOB_INDUSTRIES, INDUSTRY_ZH } from '../../constants/industries'

export default function JobFormModal({ job, onSave, onClose }) {
  const isEdit = Boolean(job)

  return (
    <ListingForm
      title={isEdit ? '编辑招聘' : '发布招聘'}
      initial={{
        title:            job?.title            ?? '',
        industry:         job?.industry         ?? 'Restaurant',
        location:         job?.location         ?? '',
        salary_range:     job?.salary_range     ?? '',
        description:      job?.description      ?? '',
        contact_phone:    job?.contact_phone    ?? '',
        contact_whatsapp: job?.contact_whatsapp ?? '',
        contact_email:    job?.contact_email    ?? '',
      }}
      onSave={onSave}
      onClose={onClose}
    >
      {({ form, set }) => (
        <>
          <Field label="行业" required>
            <select id="job-industry" value={form.industry} onChange={set('industry')}>
              {JOB_INDUSTRIES.map(i => <option key={i} value={i}>{INDUSTRY_ZH[i]}</option>)}
            </select>
          </Field>
          <Field label="薪资">
            <input
              id="job-salary"
              value={form.salary_range}
              onChange={set('salary_range')}
              placeholder="例如 €1000-1200 / 月"
            />
          </Field>
        </>
      )}
    </ListingForm>
  )
}
