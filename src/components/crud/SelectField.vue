<template>
  <!-- `flush` drops the stacking margin, for a field sitting in a row. It is
       bound rather than added, because mb-3 would win over an added mb-0. -->
  <div class="relative w-full" :class="flush ? '' : 'mb-3'">
    <label
      v-if="label"
      class="block uppercase text-blueGray-600 text-xs font-bold mb-2"
      :for="fieldId"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <select
      :id="fieldId"
      :value="modelValue"
      :required="required"
      :disabled="disabled"
      class="border-l-4 px-3 py-3 h-11 placeholder-blueGray-300 rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150 disabled:bg-blueGray-100"
      :class="[toneClass, error ? 'ring-1 ring-red-500' : '']"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <p v-if="error" class="text-red-500 text-xs mt-1">{{ error }}</p>
    <p v-else-if="hint" class="text-blueGray-400 text-xs mt-1">{{ hint }}</p>
  </div>
</template>

<script>
let counter = 0;

/**
 * Optional colour, so a row of filters can be told apart at a glance. Each one
 * is a left bar plus a tint of the same hue; `plain` is the form default.
 */
const TONES = {
  plain: "border-blueGray-200 bg-white text-blueGray-600",
  lightBlue: "border-lightBlue-500 bg-lightBlue-50 text-lightBlue-700",
  emerald: "border-emerald-500 bg-emerald-50 text-emerald-700",
  amber: "border-amber-500 bg-amber-50 text-amber-700",
  teal: "border-teal-500 bg-teal-50 text-teal-700",
  blueGray: "border-blueGray-500 bg-blueGray-50 text-blueGray-700",
  red: "border-red-500 bg-red-50 text-red-700",
};

export default {
  name: "select-field",
  props: {
    modelValue: { type: [String, Number], default: "" },
    label: { type: String, default: "" },
    /** [{ value, label }] */
    options: { type: Array, default: () => [] },
    placeholder: { type: String, default: "" },
    required: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    hint: { type: String, default: "" },
    error: { type: String, default: "" },
    id: { type: String, default: "" },
    /** One of the TONES keys; anything unknown falls back to `plain`. */
    tone: { type: String, default: "plain" },
    /** True for a field in a row with others, rather than stacked in a form. */
    flush: { type: Boolean, default: false },
  },
  emits: ["update:modelValue"],
  data() {
    counter += 1;
    return { fieldId: this.id || `select-${counter}` };
  },
  computed: {
    toneClass() {
      return TONES[this.tone] || TONES.plain;
    },
  },
};
</script>
