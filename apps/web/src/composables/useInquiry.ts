import { ref, shallowRef } from 'vue'
import { inquirySchema, type InquiryRequest, type InquiryResponse } from '@interior/contracts'
import { getJson } from '../lib/api'

export interface ContactFields {
  name: string
  phone: string
  email: string
  comment: string
}
export function useInquiry(context: () => Omit<InquiryRequest, keyof ContactFields>) {
  const inquiry = ref<ContactFields>({ name: '', phone: '', email: '', comment: '' })
  const inquiryMessage = shallowRef('')
  const inquiryError = shallowRef('')
  const submitting = shallowRef(false)
  let attempt: { payload: string; key: string } | undefined
  async function submitInquiry() {
    if (submitting.value) return
    inquiryError.value = ''
    inquiryMessage.value = ''
    const parsed = inquirySchema.safeParse({
      ...context(),
      ...inquiry.value,
      email: inquiry.value.email || null,
      comment: inquiry.value.comment || null,
    })
    if (!parsed.success) {
      inquiryError.value = 'Проверьте имя, телефон, email и размеры проекта.'
      return
    }
    const payload = JSON.stringify(parsed.data)
    if (attempt?.payload !== payload) attempt = { payload, key: crypto.randomUUID() }
    submitting.value = true
    try {
      const response = await getJson<InquiryResponse>('/api/v1/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attempt.key },
        body: payload,
      })
      inquiryMessage.value = `Обращение ${response.requestId.slice(0, 8)} сохранено в демонстрационной базе.`
      inquiry.value = { name: '', phone: '', email: '', comment: '' }
      attempt = undefined
    } catch (reason) {
      inquiryError.value = reason instanceof Error ? reason.message : 'Не удалось сохранить обращение.'
    } finally {
      submitting.value = false
    }
  }
  return { inquiry, inquiryMessage, inquiryError, submitting, submitInquiry }
}
