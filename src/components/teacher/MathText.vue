<template>
  <!--
    Question text and worked answers are full of LaTeX. Anything between $...$
    (inline) or $$...$$ (display) is typeset; everything else is shown as it
    was written. Text that is not valid LaTeX is left alone rather than
    replaced with an error, so a half-typed formula still reads.
  -->
  <span class="math-text" v-html="html"></span>
</template>

<script>
import katex from "katex";
import "katex/dist/katex.min.css";

// $$...$$ first: otherwise the inline rule would match the inner $...$.
const MATH = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (character) => ESCAPES[character]);
}

function typeset(tex, displayMode) {
  try {
    return katex.renderToString(tex, { displayMode, throwOnError: true });
  } catch (error) {
    // Not valid LaTeX -- show the source, delimiters and all.
    return escapeHtml(displayMode ? `$$${tex}$$` : `$${tex}$`);
  }
}

/** @param {string} text @returns {string} html */
export function renderMathText(text) {
  if (!text) return "";
  return String(text)
    .split(MATH)
    .map((part) => {
      if (part.length > 4 && part.startsWith("$$") && part.endsWith("$$")) {
        return typeset(part.slice(2, -2), true);
      }
      if (part.length > 2 && part.startsWith("$") && part.endsWith("$")) {
        return typeset(part.slice(1, -1), false);
      }
      return escapeHtml(part);
    })
    .join("");
}

export default {
  name: "math-text",
  props: {
    text: { type: String, default: "" },
  },
  computed: {
    html() {
      return renderMathText(this.text);
    },
  },
};
</script>

<style scoped>
/* KaTeX centres display maths with wide margins, which is too much inside a
   table cell or a card. */
.math-text ::v-deep .katex-display {
  margin: 0.5rem 0;
}

.math-text ::v-deep .katex {
  font-size: 1.05em;
}
</style>
