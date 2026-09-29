<template>
  <!--
    One or more lines over the same exams, with the pass mark drawn across them.

    Hand-drawn SVG rather than a chart library: a couple of lines and a rule
    print exactly as they look, need no dependency to redraw when the window
    changes size, and the axis stays fixed at 0-100 -- a zoomed axis makes a
    wobble look like a collapse.

    Every series shares the same x positions, so the first series' labels are
    the axis. A series with a null value is simply not drawn there: an exam the
    class did not sit is a gap, not a zero.
  -->
  <div class="trend-chart">
    <div v-if="!drawn.length" class="text-sm text-blueGray-400 py-4">
      {{ emptyText }}
    </div>

    <template v-else>
      <div v-if="series.length > 1" class="flex flex-wrap items-center gap-3 mb-2 print:hidden">
        <span v-for="line in drawn" :key="line.key" class="inline-flex items-center text-xs text-blueGray-600">
          <span class="w-4 h-1 rounded mr-1" :style="{ backgroundColor: line.colour }"></span>
          {{ line.name }}
        </span>
      </div>

      <svg
        :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
        class="w-full"
        :style="{ height: height + 'rem' }"
        role="img"
        :aria-label="chartLabel"
        preserveAspectRatio="none"
      >
        <g>
          <line
            v-for="tick in ticks"
            :key="`grid-${tick}`"
            :x1="PAD_LEFT"
            :x2="WIDTH - PAD_RIGHT"
            :y1="yFor(tick)"
            :y2="yFor(tick)"
            stroke="#E2E8F0"
            stroke-width="1"
          />
          <text
            v-for="tick in ticks"
            :key="`label-${tick}`"
            :x="PAD_LEFT - 8"
            :y="yFor(tick) + 4"
            text-anchor="end"
            class="fill-current text-blueGray-400"
            style="font-size: 11px"
          >
            {{ tick }}%
          </text>
        </g>

        <!-- The pass mark: what every other point is read against. -->
        <template v-if="passMark !== null">
          <line
            :x1="PAD_LEFT"
            :x2="WIDTH - PAD_RIGHT"
            :y1="yFor(passMark)"
            :y2="yFor(passMark)"
            stroke="#F59E0B"
            stroke-width="2"
            stroke-dasharray="6 4"
          />
          <text
            :x="WIDTH - PAD_RIGHT"
            :y="yFor(passMark) - 6"
            text-anchor="end"
            style="font-size: 11px"
            class="fill-current text-amber-600"
          >
            Pass mark {{ passMark }}%
          </text>
        </template>

        <!-- Lines first, points on top of them. -->
        <g v-for="line in drawn" :key="`line-${line.key}`">
          <polyline
            v-if="line.drawn.length > 1"
            :points="polylineFor(line)"
            fill="none"
            :stroke="line.colour"
            stroke-width="3"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
          <g v-for="point in line.drawn" :key="`p-${point.key}`">
            <circle
              :cx="xFor(point.position)"
              :cy="yFor(point.value)"
              r="5"
              fill="#fff"
              :stroke="line.colour"
              stroke-width="3"
            />
            <text
              v-if="series.length === 1"
              :x="xFor(point.position)"
              :y="yFor(point.value) - 14"
              text-anchor="middle"
              style="font-size: 12px; font-weight: 600"
              class="fill-current text-blueGray-600"
            >
              {{ Math.round(point.value) }}%
            </text>
            <title>{{ line.name }} — {{ point.label }}: {{ Math.round(point.value) }}%</title>
          </g>
        </g>
      </svg>

      <!-- The exam names beneath, because they do not fit on the axis. -->
      <div class="flex flex-wrap mt-1">
        <div
          v-for="point in axis"
          :key="`name-${point.key}`"
          class="text-center px-1"
          :style="{ width: 100 / axis.length + '%' }"
        >
          <button
            v-if="point.key"
            type="button"
            class="text-xs text-blueGray-400 hover:text-lightBlue-600 truncate w-full print:hidden"
            :title="point.label"
            @click="$emit('select-point', point.key)"
          >
            {{ point.label }}
          </button>
          <span v-else class="text-xs text-blueGray-400 block truncate">{{ point.label }}</span>
          <span v-if="point.note" class="block text-xs text-blueGray-300">{{ point.note }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
/** The drawing area. Percentages are fixed to 0-100, so the scale is fixed too. */
const WIDTH = 800;
const PAD_LEFT = 46;
const PAD_RIGHT = 16;
const PAD_TOP = 24;
const PAD_BOTTOM = 24;

export default {
  name: "trend-chart",
  props: {
    /**
     * `[{ key, name, colour, points: [{ key, label, value, note }] }]`.
     * Every series is expected to line up on the same points, in the same
     * order; the first one supplies the axis labels.
     */
    series: { type: Array, default: () => [] },
    /** Where "pass" sits, in per cent. Null leaves the line off. */
    passMark: { type: Number, default: 50 },
    /** How tall to draw it. The multi-line view needs more room. */
    height: { type: Number, default: 15 },
    emptyText: { type: String, default: "No finalized exam to plot yet." },
  },
  emits: ["select-point"],
  data() {
    return { WIDTH, PAD_LEFT, PAD_RIGHT, HEIGHT: 300 };
  },
  computed: {
    ticks() {
      return [0, 25, 50, 75, 100];
    },
    /** The series that have something to draw, in order. */
    drawn() {
      return this.series
        .map((line) => ({
          ...line,
          drawn: (line.points || [])
            .map((point, position) => ({ ...point, position }))
            .filter((point) => point.value !== null && point.value !== undefined),
        }))
        .filter((line) => line.drawn.length);
    },
    axis() {
      const first = this.series[0];
      return first ? first.points || [] : [];
    },
    chartLabel() {
      const lines = this.drawn.map((line) => {
        const values = line.drawn.map((point) => `${point.label} ${Math.round(point.value)}%`);
        return `${line.name}: ${values.join(", ")}`;
      });
      const pass = this.passMark === null ? "" : ` Pass mark ${this.passMark}%.`;
      return `${lines.join(". ")}.${pass}`;
    },
  },
  methods: {
    xFor(position) {
      const count = this.axis.length;
      if (count <= 1) return (WIDTH + PAD_LEFT - PAD_RIGHT) / 2;
      const span = WIDTH - PAD_LEFT - PAD_RIGHT;
      return PAD_LEFT + (span * position) / (count - 1);
    },
    yFor(value) {
      const span = this.HEIGHT - PAD_TOP - PAD_BOTTOM;
      const clamped = Math.max(0, Math.min(100, value));
      return PAD_TOP + span * (1 - clamped / 100);
    },
    polylineFor(line) {
      return line.drawn
        .map((point) => `${this.xFor(point.position)},${this.yFor(point.value)}`)
        .join(" ");
    },
  },
};
</script>
