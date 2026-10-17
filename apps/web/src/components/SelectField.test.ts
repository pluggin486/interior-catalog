import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SelectField, { type SelectPosition } from './SelectField.vue'

const options = [
  { value: '', label: 'Все материалы' },
  { value: 'oak', label: 'Массив дуба' },
  { value: 'unavailable', label: 'Недоступный материал', disabled: true },
]
const wrappers: VueWrapper[] = []

function render(props: { position?: SelectPosition; disabled?: boolean; modelValue?: string } = {}) {
  const wrapper = mount(SelectField, {
    props: { label: 'Материал', options, modelValue: '', ...props },
    attachTo: document.body,
  })
  wrappers.push(wrapper)
  return wrapper
}

async function open(wrapper: VueWrapper) {
  await wrapper.get('[role="combobox"]').trigger('keydown', { key: 'Enter' })
  await flushPromises()
  await vi.waitFor(() => expect(document.querySelector('[role="listbox"]')).not.toBeNull())
  return document.querySelector<HTMLElement>('[role="listbox"]')!
}

function option(label: string) {
  return [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (element) => element.textContent?.trim() === label,
  )!
}

async function choose(label: string) {
  option(label).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  await flushPromises()
}

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
})

describe('SelectField', () => {
  it('opens a styled list below the field by default and selects a value', async () => {
    const wrapper = render()
    const list = await open(wrapper)
    expect(list.dataset.side).toBe('bottom')
    expect(wrapper.element.contains(list)).toBe(false)
    await choose('Массив дуба')
    expect(wrapper.emitted('update:modelValue')).toEqual([['oak']])
    expect(document.querySelector('[role="listbox"]')).toBeNull()
  })

  it('allows clearing the filter with an empty value and reflects external updates', async () => {
    const wrapper = render({ modelValue: 'oak' })
    expect(wrapper.get('[role="combobox"]').text()).toBe('Массив дуба')
    await open(wrapper)
    await choose('Все материалы')
    expect(wrapper.emitted('update:modelValue')).toEqual([['']])
    await wrapper.setProps({ modelValue: '' })
    expect(wrapper.get('[role="combobox"]').text()).toBe('Все материалы')
  })

  it('closes on Escape, returns focus and preserves the selected value', async () => {
    const wrapper = render({ modelValue: 'oak' })
    const trigger = wrapper.get('[role="combobox"]')
    await open(wrapper)
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(document.querySelector('[role="listbox"]')).toBeNull()
    expect(document.activeElement).toBe(trigger.element)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('does not open when disabled or allow selecting a disabled option', async () => {
    const wrapper = render({ disabled: true })
    await wrapper.get('[role="combobox"]').trigger('keydown', { key: 'Enter' })
    expect(document.querySelector('[role="listbox"]')).toBeNull()
    await wrapper.setProps({ disabled: false })
    await open(wrapper)
    await choose('Недоступный материал')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('closes on a pointer click outside without changing the value', async () => {
    const wrapper = render({ modelValue: 'oak' })
    await open(wrapper)
    // The dismissable layer registers its document listener on the next timer tick.
    await new Promise((resolve) => setTimeout(resolve, 0))
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))
    await vi.waitFor(() => expect(document.querySelector('[role="listbox"]')).toBeNull())
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it.each([
    ['up', 'top'],
    ['left', 'left'],
    ['right', 'right'],
  ] as const)('positions the list on the requested %s side', async (position, expectedSide) => {
    const wrapper = render({ position })
    const list = await open(wrapper)
    expect(list.dataset.side).toBe(expectedSide)
  })
})
