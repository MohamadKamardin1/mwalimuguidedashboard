<template>
  <div class="relative w-full mb-3">
    <label
      v-if="label"
      class="block uppercase text-blueGray-600 text-xs font-bold mb-2"
      :for="fieldId"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <input
      :id="fieldId"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :required="required"
      :disabled="disabled"
      class="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150 disabled:bg-blueGray-100"
      :class="error ? 'ring-1 ring-red-500' : ''"
      @input="$emit('update:modelValue', $event.target.value)"
      @blur="$emit('blur')"
    />

    <p v-if="error" class="text-red-500 text-xs mt-1">{{ error }}</p>
    <p v-else-if="hint" class="text-blueGray-400 text-xs mt-1">{{ hint }}</p>
  </div>
</template>

<script>
let counter = 0;

export default {
  name: "form-field",
  props: {
    modelValue: { type: [String, Number], default: "" },
    label: { type: String, default: "" },
    type: { type: String, default: "text" },
    placeholder: { type: String, default: "" },
    autocomplete: { type: String, default: "off" },
    required: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    hint: { type: String, default: "" },
    // The server's complaint about this one field, if it had one.
    error: { type: String, default: "" },
    id: { type: String, default: "" },
  },
  emits: ["update:modelValue", "blur"],
  data() {
    // A label needs something to point at even when the caller gives no id.
    counter += 1;
    return { fieldId: this.id || `field-${counter}` };
  },
};
</script>
