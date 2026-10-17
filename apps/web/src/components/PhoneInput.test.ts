import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import PhoneInput from './PhoneInput.vue'

const wrappers: VueWrapper[] = []
function render(modelValue = '') {
  const wrapper = mount(PhoneInput, { props: { modelValue }, attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
})

describe('PhoneInput', () => {
  it.each(['9991234567', '+79991234567', '89991234567', '8 (999) 123-45-67'])(
    'formats %s and updates the form model',
    async (value) => {
      const wrapper = render()
      const input = wrapper.get('input')
      await input.setValue(value)
      expect(input.element.value).toBe('+7 (999) 123-45-67')
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['+7 (999) 123-45-67'])
      expect(input.element.checkValidity()).toBe(true)
    },
  )

  it('rejects letters and prevents submitting an incomplete phone number', async () => {
    const wrapper = render()
    const input = wrapper.get('input')
    await input.setValue('abc99912')
    expect(input.element.value).toBe('+7 (999) 12')
    expect(input.element.validity.patternMismatch).toBe(true)
    expect(input.element.checkValidity()).toBe(false)
    await input.setValue('')
    await input.trigger('blur')
    await flushPromises()
    expect(input.element.value).toBe('')
    expect(input.element.validity.valueMissing).toBe(true)
  })

  it('reflects external changes and clears the mask after the form resets', async () => {
    const wrapper = render('+7 (999) 123-45-67')
    expect(wrapper.get('input').element.value).toBe('+7 (999) 123-45-67')
    await wrapper.setProps({ modelValue: '' })
    await flushPromises()
    expect(wrapper.get('input').element.value).toBe('')
    await wrapper.setProps({ modelValue: '+7 (900) 000-00-00', disabled: true })
    expect(wrapper.get('input').element.value).toBe('+7 (900) 000-00-00')
    expect(wrapper.get('input').element.disabled).toBe(true)
  })
})
