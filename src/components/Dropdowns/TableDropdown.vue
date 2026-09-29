<template>
  <div>
    <a
      class="text-blueGray-500 py-1 px-3"
      href="#pablo"
      ref="btnDropdownRef"
      v-on:click="toggleDropdown($event)"
    >
      <i class="fas fa-ellipsis-v"></i>
    </a>
    <div
      ref="popoverDropdownRef"
      class="bg-white text-base z-50 float-left py-2 list-none text-left rounded shadow-lg min-w-48"
      v-bind:class="{
        hidden: !dropdownPopoverShow,
        block: dropdownPopoverShow,
      }"
    >
      <a
        v-for="item in items"
        :key="item.action || item.label"
        href="javascript:void(0);"
        class="text-sm py-2 px-4 font-normal block w-full whitespace-nowrap bg-transparent"
        :class="item.danger ? 'text-red-500' : 'text-blueGray-700'"
        @click="choose(item)"
      >
        <i v-if="item.icon" class="mr-2 text-xs" :class="item.icon"></i>
        {{ item.label }}
      </a>
    </div>
  </div>
</template>
<script>
import { createPopper } from "@popperjs/core";

export default {
  data() {
    return {
      dropdownPopoverShow: false,
    };
  },
  props: {
    /** [{ label, action, icon?, danger? }] — the demo entries by default. */
    items: {
      type: Array,
      default: () => [
        { label: "Action", action: "action" },
        { label: "Another action", action: "another" },
        { label: "Something else here", action: "else" },
      ],
    },
  },
  emits: ["select"],
  methods: {
    toggleDropdown: function (event) {
      event.preventDefault();
      if (this.dropdownPopoverShow) {
        this.dropdownPopoverShow = false;
      } else {
        this.dropdownPopoverShow = true;
        createPopper(this.$refs.btnDropdownRef, this.$refs.popoverDropdownRef, {
          placement: "bottom-start",
        });
      }
    },
    choose(item) {
      this.dropdownPopoverShow = false;
      this.$emit("select", item.action, item);
    },
  },
};
</script>
