<template>
  <report-page
    :title="heading"
    :subtitle="subtitle"
    :loading="loading"
    :error="error"
    @reload="load"
  >
    <template #header-actions>
      <status-badge v-if="report" :status="report.status" />
    </template>

    <template #toolbar>
      <report-toolbar
        :back-to="{ name: 'report-assessment-picker', query: $route.query }"
        back-label="Exams"
        @print="print"
        @export="exportCsv"
      />
    </template>

    <template v-if="report">
      <!-- 1. What the exam was, and how it went. -->
      <div class="w-full px-4">
        <div class="relative flex flex-col min-w-0 break-words bg-white rounded shadow-lg mb-4 print:shadow-none print:border print:border-blueGray-200">
          <div class="px-4 py-4">
            <dl class="assess-facts grid grid-cols-2 md:grid-cols-3 gap-3">
              <div v-for="fact in facts" :key="fact.label">
                <dt class="text-blueGray-400 uppercase font-bold text-xs">{{ fact.label }}</dt>
                <dd class="text-blueGray-700 font-semibold text-sm mt-1">{{ fact.value }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <verdict-card :summary="verdict" :evidence="evidence" />
      </div>

      <!-- 2. The headline numbers. -->
      <div class="w-full px-4">
        <div class="assess-kpis flex flex-wrap -mx-2">
          <div v-for="kpi in kpis" :key="kpi.label" class="w-6/12 md:w-4/12 px-2">
            <kpi-row v-bind="kpi" />
          </div>
        </div>
      </div>

      <!-- 3. Who landed where: the spread, then the grades it falls into. -->
      <div class="w-full px-4">
        <report-section title="Score distribution" :takeaway="distributionTakeaway">
          <div class="relative break-words w-full shadow-lg rounded bg-white p-4 print:shadow-none print:border print:border-blueGray-200">
            <div class="relative pt-6">
              <!-- Where the average falls, drawn against the buckets rather
                   than said in a caption: a mean off the edge of the chart is
                   the fastest way to see the class is bunched. -->
              <div
                v-if="report.mean !== null"
                class="absolute inset-y-0 border-l-2 border-dashed border-lightBlue-600 pointer-events-none"
                :style="{ left: meanLeft + '%' }"
              >
                <span
                  class="absolute -top-5 text-xs font-bold text-lightBlue-700 whitespace-nowrap bg-white px-1"
                  :style="{ transform: 'translateX(-50%)' }"
                >
                  Mean {{ pct(report.mean) }}
                </span>
              </div>

              <div class="assess-chart flex items-end h-40">
                <div
                  v-for="bucket in report.histogram"
                  :key="bucket.label"
                  class="flex-1 flex flex-col items-center justify-end h-full px-1"
                >
                  <span class="text-xs text-blueGray-500 mb-1">{{ bucket.count }}</span>
                  <div
                    class="w-full bg-lightBlue-400 rounded-t"
                    :style="{ height: Math.max(2, bucket.percent) + '%' }"
                    :title="`${bucket.label}: ${bucket.count} script(s)`"
                  ></div>
                  <span class="text-xs text-blueGray-400 mt-1">{{ bucket.label }}</span>
                </div>
              </div>
            </div>

            <p class="text-xs font-bold uppercase text-blueGray-500 mt-6 mb-2">Grades</p>
            <div class="flex w-full h-4 rounded overflow-hidden bg-blueGray-100">
              <div
                v-for="band in report.grades"
                :key="band.grade"
                :class="gradeColour(band.grade)"
                :style="{ width: band.percent + '%' }"
                :title="`${band.grade}: ${band.count} script(s)`"
              ></div>
            </div>
            <div class="flex flex-wrap gap-3 mt-2">
              <span v-for="band in report.grades" :key="band.grade" class="text-xs text-blueGray-600 inline-flex items-center">
                <span class="w-2 h-2 rounded-full mr-1" :class="gradeColour(band.grade)"></span>
                {{ band.grade }} · {{ band.count }}
              </span>
            </div>
          </div>
        </report-section>
      </div>

      <!-- 4. Question by question. -->
      <div class="w-full px-4">
        <report-section
          class="assess-breakable"
          title="Question analysis"
          :takeaway="`Worst first. Click a heading to reorder, or a question to see its rubric.`"
        >
          <div class="relative flex flex-col min-w-0 break-words w-full shadow-lg rounded bg-white print:shadow-none print:border print:border-blueGray-200">
            <!-- The same rows as cards below `md`, where seven columns cannot
                 fit a phone. The print sheet hides these and shows the table,
                 so a printed report carries one rendering, not two. -->
            <div class="md:hidden divide-y divide-blueGray-100">
              <div v-for="row in sortedQuestions" :key="row.number" class="px-4 py-3">
                <div class="flex items-start">
                  <button
                    type="button"
                    class="assess-toggle w-11 h-11 inline-flex items-center justify-center text-blueGray-400 hover:text-lightBlue-600 flex-none -ml-3"
                    :aria-expanded="expanded[row.number] ? 'true' : 'false'"
                    :aria-label="`${expanded[row.number] ? 'Hide' : 'Show'} the rubric for question ${row.number}`"
                    @click="toggle(row.number)"
                  >
                    <i class="fas" :class="expanded[row.number] ? 'fa-chevron-down' : 'fa-chevron-right'" aria-hidden="true"></i>
                  </button>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-baseline">
                      <span class="font-bold text-blueGray-700">Question {{ row.number }}</span>
                      <span class="text-xs text-blueGray-400 ml-1">/{{ row.maxMarks }}</span>
                      <span class="flex-1"></span>
                      <span class="font-bold" :class="difficultyOf(row.averagePercent).text">
                        {{ pct(row.averagePercent) }}
                      </span>
                    </div>
                    <div class="w-full bg-blueGray-100 rounded-full h-2 mt-2">
                      <div
                        class="h-2 rounded-full"
                        :class="difficultyOf(row.averagePercent).bar"
                        :style="{ width: clamp(row.averagePercent) + '%' }"
                      ></div>
                    </div>

                    <!-- The width a skill code was capped to in the table is
                         more than a card has; here it wraps instead. -->
                    <div v-if="skillsFor(row.number).length" class="mt-2">
                      <span
                        v-for="skill in skillsFor(row.number)"
                        :key="skill.id"
                        class="inline-block max-w-full truncate align-middle text-xs rounded-full px-2 py-1 mr-1 mb-1 bg-blueGray-100 text-blueGray-600"
                        :title="`${skill.code} — ${skill.name}`"
                      >
                        {{ skill.code }}
                      </span>
                    </div>
                    <p v-else class="text-xs text-blueGray-400 mt-2">Untagged</p>

                    <p class="text-xs text-blueGray-500 mt-2">
                      Full {{ pct(row.percentFull) }} · Zero
                      <span :class="row.percentZero > 30 ? 'text-red-600 font-bold' : ''">{{ pct(row.percentZero) }}</span>
                      · {{ round(row.average, 1) }}/{{ row.maxMarks }} on average
                    </p>

                    <div class="flex flex-wrap items-center gap-2 mt-2">
                      <span class="text-xs font-semibold rounded-full px-2 py-1 whitespace-nowrap" :class="difficultyOf(row.averagePercent).chip">
                        {{ difficultyOf(row.averagePercent).label }}
                      </span>
                      <span v-if="row.mostCommonError === 'none'" class="text-xs text-blueGray-400">No common mistake</span>
                      <span v-else class="text-xs font-semibold rounded-full px-2 py-1 whitespace-nowrap bg-amber-200 text-amber-800">
                        {{ row.mostCommonError }}
                      </span>
                    </div>
                  </div>
                </div>

                <div v-if="expanded[row.number]" class="mt-3 rounded bg-blueGray-50 px-3 py-3">
                  <div class="assess-detail flex flex-wrap -mx-2">
                    <div class="w-full md:w-6/12 px-2 mb-3">
                      <h4 class="text-xs font-bold uppercase text-blueGray-500 mb-2">Rubric: how often each step was awarded</h4>
                      <p v-if="!rubricFor(row.number).length" class="text-sm text-blueGray-400">
                        No rubric was written for this question.
                      </p>
                      <div v-for="item in rubricFor(row.number)" :key="item.key" class="mb-3">
                        <div class="flex items-baseline">
                          <span class="flex-1 min-w-0 text-sm text-blueGray-700 truncate" :title="item.description">
                            {{ item.description }}
                          </span>
                          <span class="flex-none text-sm font-bold ml-2 text-blueGray-700">
                            {{ pct(item.awardRate) }}
                          </span>
                        </div>
                        <div class="flex items-center mt-1">
                          <div class="flex-1 bg-blueGray-200 rounded-full h-2">
                            <div class="h-2 rounded-full bg-lightBlue-400" :style="{ width: clamp(item.awardRate) + '%' }"></div>
                          </div>
                          <span class="flex-none text-xs text-blueGray-400 ml-2 w-24 text-right">
                            {{ item.awarded }} of {{ item.offered }} awarded
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="w-full md:w-6/12 px-2">
                      <h4 class="text-xs font-bold uppercase text-blueGray-500 mb-2">What the model made of it</h4>
                      <ai-note
                        v-if="mistakeFor(row.number)"
                        label="AI reading"
                        :text="mistakeFor(row.number)"
                        hint="The model's summary of what went wrong here, from the class insight."
                      />
                      <div v-else-if="hardestReason(row.number)" class="text-sm text-blueGray-700">
                        {{ hardestReason(row.number) }}
                      </div>
                      <p v-else class="text-sm text-blueGray-400">
                        The model had nothing to say about this question on its own.
                      </p>
                      <p class="text-xs text-blueGray-400 mt-2">
                        {{ row.answers }} answer(s), {{ row.marked }} marked.
                        <span v-if="row.percentBlank"> {{ pct(row.percentBlank) }} left blank.</span>
                        <span v-if="row.averageConfidence !== null"> Marked with {{ pct(row.averageConfidence) }} average confidence.</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="hidden md:block overflow-x-auto">
              <table class="w-full table-fixed border-collapse text-sm">
                <thead>
                  <tr>
                    <th scope="col" class="w-20 px-2 border-b border-blueGray-100 text-left" :aria-sort="ariaSort('number')">
                      <button type="button" class="py-3 text-xs uppercase font-bold text-blueGray-500 hover:text-lightBlue-600 inline-flex items-center" @click="sortBy('number')">
                        Question <i class="fas ml-1" :class="sortIcon('number')" aria-hidden="true"></i>
                      </button>
                    </th>
                    <th scope="col" class="hidden md:table-cell w-56 px-2 border-b border-blueGray-100 text-left">
                      <span class="text-xs uppercase font-bold text-blueGray-500">Skills</span>
                    </th>
                    <th scope="col" class="px-2 border-b border-blueGray-100 text-right w-32" :aria-sort="ariaSort('averagePercent')">
                      <button type="button" class="w-full py-3 text-xs uppercase font-bold text-blueGray-500 hover:text-lightBlue-600 inline-flex items-center justify-end" @click="sortBy('averagePercent')">
                        Average <i class="fas ml-1" :class="sortIcon('averagePercent')" aria-hidden="true"></i>
                      </button>
                    </th>
                    <th scope="col" class="hidden md:table-cell w-20 px-2 border-b border-blueGray-100 text-right" :aria-sort="ariaSort('percentFull')">
                      <button type="button" class="w-full py-3 text-xs uppercase font-bold text-blueGray-500 hover:text-lightBlue-600 inline-flex items-center justify-end" @click="sortBy('percentFull')">
                        Full <i class="fas ml-1" :class="sortIcon('percentFull')" aria-hidden="true"></i>
                      </button>
                    </th>
                    <th scope="col" class="hidden md:table-cell w-20 px-2 border-b border-blueGray-100 text-right" :aria-sort="ariaSort('percentZero')">
                      <button type="button" class="w-full py-3 text-xs uppercase font-bold text-blueGray-500 hover:text-lightBlue-600 inline-flex items-center justify-end" @click="sortBy('percentZero')">
                        Zero <i class="fas ml-1" :class="sortIcon('percentZero')" aria-hidden="true"></i>
                      </button>
                    </th>
                    <th scope="col" class="w-28 px-2 border-b border-blueGray-100 text-left">
                      <span class="text-xs uppercase font-bold text-blueGray-500">Difficulty</span>
                    </th>
                    <th scope="col" class="w-40 px-2 border-b border-blueGray-100 text-left">
                      <span class="text-xs uppercase font-bold text-blueGray-500">Most common mistake</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tbody v-for="row in sortedQuestions" :key="row.number">
                    <tr class="hover:bg-blueGray-50 align-top">
                      <td class="px-2 py-2 border-b border-blueGray-100">
                        <div class="flex items-center">
                          <button
                            type="button"
                            class="assess-toggle w-11 h-11 inline-flex items-center justify-center text-blueGray-400 hover:text-lightBlue-600 flex-none"
                            :aria-expanded="expanded[row.number] ? 'true' : 'false'"
                            :aria-label="`${expanded[row.number] ? 'Hide' : 'Show'} the rubric for question ${row.number}`"
                            @click="toggle(row.number)"
                          >
                            <i class="fas" :class="expanded[row.number] ? 'fa-chevron-down' : 'fa-chevron-right'" aria-hidden="true"></i>
                          </button>
                          <span class="font-bold text-blueGray-700">{{ row.number }}</span>
                          <span class="text-xs text-blueGray-400 ml-1">/{{ row.maxMarks }}</span>
                        </div>
                      </td>
                      <td class="hidden md:table-cell px-2 py-2 border-b border-blueGray-100">
                        <span v-if="!skillsFor(row.number).length" class="text-xs text-blueGray-400">Untagged</span>
                        <!-- Capped in px, not in rem: a skill code is the widest
                             thing in this table, and an uncapped one pushes the
                             whole row sideways on a laptop. -->
                        <span
                          v-for="skill in skillsFor(row.number)"
                          :key="skill.id"
                          class="inline-block max-w-full truncate align-middle text-xs rounded-full px-2 py-1 mr-1 mb-1 bg-blueGray-100 text-blueGray-600"
                          :style="{ maxWidth: '11rem' }"
                          :title="`${skill.code} — ${skill.name}`"
                        >
                          {{ skill.code }}
                        </span>
                      </td>
                      <td class="px-2 py-2 border-b border-blueGray-100">
                        <div class="text-right font-bold" :class="difficultyOf(row.averagePercent).text">
                          {{ pct(row.averagePercent) }}
                        </div>
                        <!-- The bar the number would be if it were a picture. -->
                        <div class="w-full bg-blueGray-100 rounded-full h-2 mt-1">
                          <div
                            class="h-2 rounded-full"
                            :class="difficultyOf(row.averagePercent).bar"
                            :style="{ width: clamp(row.averagePercent) + '%' }"
                          ></div>
                        </div>
                        <div class="text-xs text-blueGray-400 text-right mt-1">
                          {{ round(row.average, 1) }}/{{ row.maxMarks }}
                        </div>
                      </td>
                      <td class="hidden md:table-cell px-2 py-2 border-b border-blueGray-100 text-right text-blueGray-600">
                        {{ pct(row.percentFull) }}
                      </td>
                      <td class="hidden md:table-cell px-2 py-2 border-b border-blueGray-100 text-right" :class="row.percentZero > 30 ? 'text-red-600 font-bold' : 'text-blueGray-600'">
                        {{ pct(row.percentZero) }}
                      </td>
                      <td class="px-2 py-2 border-b border-blueGray-100">
                        <span class="text-xs font-semibold rounded-full px-2 py-1 whitespace-nowrap" :class="difficultyOf(row.averagePercent).chip">
                          {{ difficultyOf(row.averagePercent).label }}
                        </span>
                      </td>
                      <td class="px-2 py-2 border-b border-blueGray-100">
                        <span v-if="row.mostCommonError === 'none'" class="text-xs text-blueGray-400">No pattern</span>
                        <span v-else class="text-xs font-semibold rounded-full px-2 py-1 whitespace-nowrap bg-amber-200 text-amber-800">
                          {{ row.mostCommonError }}
                        </span>
                      </td>
                    </tr>

                    <tr v-if="expanded[row.number]" class="bg-blueGray-50">
                      <td colspan="7" class="px-4 py-4 border-b border-blueGray-100">
                        <div class="assess-detail flex flex-wrap -mx-2">
                          <div class="w-full md:w-6/12 px-2 mb-3">
                            <h4 class="text-xs font-bold uppercase text-blueGray-500 mb-2">Rubric: how often each step was awarded</h4>
                            <p v-if="!rubricFor(row.number).length" class="text-sm text-blueGray-400">
                              No rubric was written for this question.
                            </p>
                            <div v-for="item in rubricFor(row.number)" :key="item.key" class="mb-3">
                              <div class="flex items-baseline">
                                <span class="flex-1 min-w-0 text-sm text-blueGray-700 truncate" :title="item.description">
                                  {{ item.description }}
                                </span>
                                <span class="flex-none text-sm font-bold ml-2 text-blueGray-700">
                                  {{ pct(item.awardRate) }}
                                </span>
                              </div>
                              <div class="flex items-center mt-1">
                                <div class="flex-1 bg-blueGray-200 rounded-full h-2">
                                  <div class="h-2 rounded-full bg-lightBlue-400" :style="{ width: clamp(item.awardRate) + '%' }"></div>
                                </div>
                                <span class="flex-none text-xs text-blueGray-400 ml-2 w-24 text-right">
                                  {{ item.awarded }} of {{ item.offered }} awarded
                                </span>
                              </div>
                            </div>
                          </div>

                          <div class="w-full md:w-6/12 px-2">
                            <h4 class="text-xs font-bold uppercase text-blueGray-500 mb-2">What the model made of it</h4>
                            <ai-note
                              v-if="mistakeFor(row.number)"
                              label="AI reading"
                              :text="mistakeFor(row.number)"
                              hint="The model's summary of what went wrong here, from the class insight."
                            />
                            <div v-else-if="hardestReason(row.number)" class="text-sm text-blueGray-700">
                              {{ hardestReason(row.number) }}
                            </div>
                            <p v-else class="text-sm text-blueGray-400">
                              The model had nothing to say about this question on its own.
                            </p>
                            <p class="text-xs text-blueGray-400 mt-2">
                              {{ row.answers }} answer(s), {{ row.marked }} marked.
                              <span v-if="row.percentBlank"> {{ pct(row.percentBlank) }} left blank.</span>
                              <span v-if="row.averageConfidence !== null"> Marked with {{ pct(row.averageConfidence) }} average confidence.</span>
                            </p>
                            <!-- The skills column is hidden on a phone, so the
                                 one place they are always readable is here. -->
                            <p v-if="skillsFor(row.number).length" class="text-xs text-blueGray-500 mt-2 md:hidden">
                              Skills:
                              <span v-for="skill in skillsFor(row.number)" :key="skill.id" class="mr-1">
                                {{ skill.code }}
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </tbody>
              </table>
            </div>
          </div>
        </report-section>
      </div>

      <!-- 5. The same rows, read as three piles. -->
      <div class="w-full px-4">
        <report-section title="Difficulty overview" :takeaway="difficultyTakeaway">
          <div class="assess-difficulty flex flex-wrap -mx-2">
            <div v-for="group in difficultyGroups" :key="group.key" class="w-full md:w-4/12 px-2 mb-3">
              <div class="relative break-words bg-white rounded shadow-lg p-4 h-full print:shadow-none print:border print:border-blueGray-200">
                <div class="flex items-center mb-2">
                  <h4 class="flex-1 text-sm font-bold uppercase" :class="group.text">{{ group.label }}</h4>
                  <span class="flex-none text-xs text-blueGray-400">{{ group.questions.length }} question(s)</span>
                </div>
                <p v-if="!group.questions.length" class="text-sm text-blueGray-400">Nothing landed here.</p>
                <div
                  v-for="question in group.questions"
                  :key="question.number"
                  class="py-2 border-b border-blueGray-100 last:border-b-0"
                >
                  <div class="flex items-baseline">
                    <span class="font-bold text-blueGray-700 text-sm">Q{{ question.number }}</span>
                    <span class="flex-1"></span>
                    <span class="text-sm font-bold" :class="group.text">{{ pct(question.averagePercent) }}</span>
                  </div>
                  <p v-if="question.averagePercent < reteachBelow" class="text-xs text-red-600 mt-1">
                    <i class="fas fa-exclamation-triangle mr-1" aria-hidden="true"></i>
                    Review the question or reteach it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </report-section>
      </div>

      <!-- 6. What the paper actually tested. -->
      <div class="w-full px-4">
        <report-section title="Skills this paper tested" :takeaway="skillsTakeaway">
          <div class="relative break-words w-full shadow-lg rounded bg-white p-4 print:shadow-none print:border print:border-blueGray-200">
            <div class="assess-skills flex flex-wrap -mx-2">
              <div v-for="skill in skills" :key="skill.skillId" class="w-full md:w-6/12 px-2">
                <skill-bar
                  :name="skillLabel(skill)"
                  :score="skill.average"
                  :measured="skill.measured"
                />
              </div>
            </div>
            <p v-if="!skills.length" class="text-sm text-blueGray-400">
              No skill has been measured on this paper yet. Skills come from the
              questions they were tagged to, and the scores appear once the exam is finalised.
            </p>
          </div>
        </report-section>
      </div>

      <!-- 7. How much of the marking a person touched. -->
      <div class="w-full px-4">
        <report-section title="Marking quality" :takeaway="markingTakeaway">
          <div class="relative break-words w-full shadow-lg rounded bg-white p-4 print:shadow-none print:border print:border-blueGray-200">
            <p class="text-sm text-blueGray-700 mb-4">{{ markingSentence }}</p>

            <div class="flex w-full h-4 rounded overflow-hidden bg-blueGray-100">
              <div class="bg-lightBlue-400" :style="{ width: report.markingQuality.aiAcceptedPercent + '%' }"></div>
              <div class="bg-amber-400" :style="{ width: report.markingQuality.teacherCorrectedPercent + '%' }"></div>
            </div>
            <div class="flex flex-wrap gap-4 mt-2">
              <span class="text-xs text-blueGray-600 inline-flex items-center">
                <span class="w-2 h-2 rounded-full mr-1 bg-lightBlue-400"></span>
                Accepted {{ pct(report.markingQuality.aiAcceptedPercent) }}
                ({{ report.markingQuality.aiAccepted }})
              </span>
              <span class="text-xs text-blueGray-600 inline-flex items-center">
                <span class="w-2 h-2 rounded-full mr-1 bg-amber-400"></span>
                Changed by a teacher {{ pct(report.markingQuality.teacherCorrectedPercent) }}
                ({{ report.markingQuality.teacherCorrected }})
              </span>
              <span class="text-xs text-blueGray-600">
                Average change
                {{ report.markingQuality.averageCorrection === null ? "—" : round(report.markingQuality.averageCorrection, 2) }} marks
              </span>
              <span class="text-xs" :class="report.markingQuality.illegible ? 'text-red-600 font-bold' : 'text-blueGray-600'">
                {{ report.markingQuality.illegible }} answer(s) could not be read
              </span>
            </div>
          </div>
        </report-section>
      </div>

      <!-- 8. Where to go next. -->
      <div class="w-full px-4 print:hidden">
        <report-section title="Take this further">
          <div class="flex flex-wrap gap-2">
            <router-link
              :to="{ name: 'teacher-exam-insights', params: { id: examId } }"
              class="h-11 inline-flex items-center bg-lightBlue-500 text-white text-xs font-bold uppercase px-4 rounded shadow hover:shadow-lg"
            >
              <i class="fas fa-lightbulb mr-1" aria-hidden="true"></i> Class insights
            </router-link>
            <router-link
              v-if="classId && subjectId && termId"
              :to="{ name: 'report-class', params: { classId }, query: { subjectId, termId } }"
              class="h-11 inline-flex items-center bg-blueGray-100 text-blueGray-700 text-xs font-bold uppercase px-4 rounded hover:bg-blueGray-200"
            >
              <i class="fas fa-users mr-1" aria-hidden="true"></i> Class report
            </router-link>
            <button
              type="button"
              class="h-11 inline-flex items-center bg-blueGray-100 text-blueGray-700 text-xs font-bold uppercase px-4 rounded hover:bg-blueGray-200"
              @click="exportCsv"
            >
              <i class="fas fa-file-csv mr-1" aria-hidden="true"></i> Export CSV
            </button>
            <button
              type="button"
              class="h-11 inline-flex items-center bg-blueGray-800 text-white text-xs font-bold uppercase px-4 rounded shadow hover:shadow-lg"
              @click="print"
            >
              <i class="fas fa-print mr-1" aria-hidden="true"></i> Print
            </button>
          </div>
        </report-section>
      </div>
    </template>
  </report-page>
</template>

<script>
import { gql } from "@/api/client";
import AiNote from "@/components/teacher/AiNote.vue";
import KpiRow from "@/components/reports/KpiRow.vue";
import ReportPage from "@/components/reports/ReportPage.vue";
import ReportSection from "@/components/reports/ReportSection.vue";
import ReportToolbar from "@/components/reports/ReportToolbar.vue";
import SkillBar from "@/components/reports/SkillBar.vue";
import StatusBadge from "@/components/crud/StatusBadge.vue";
import VerdictCard from "@/components/reports/VerdictCard.vue";
import { gradeColour, percent, round } from "@/lib/scale";
import { exportRows, printPage } from "@/lib/reportIO";

const REPORT = `
  query ($examId: ID!) {
    assessmentReport(examId: $examId) {
      examId title status totalMarks markedScripts
      mean median stdDev minimum maximum passRate difficulty
      histogram { label lower upper count percent }
      grades { grade count percent }
      questions {
        number maxMarks answers marked average averagePercent
        percentFull percentZero percentBlank mostCommonError averageConfidence
        teacherCorrected
      }
      rubricItems { questionNumber description marks offered awarded awardRate }
      markingQuality {
        aiAccepted teacherCorrected aiAcceptedPercent teacherCorrectedPercent
        corrections averageCorrection illegible averageConfidence
      }
    }
  }
`;

const CONTEXT = `
  query ($examId: ID!) {
    exam(id: $examId) {
      id title status createdAt
      subject { id name code }
      schoolClass { id name }
      term { id name year startDate endDate }
      questions { number skills { skill { id code name } } }
    }
  }
`;

/**
 * The model's take on the same paper, read for the two things arithmetic
 * cannot say: which skill to reteach, and what the mistakes had in common.
 */
const INSIGHT = `
  query ($examId: ID!) {
    classInsights(examId: $examId) {
      id language hardestQuestions commonMistakes reteachRecommendations
    }
  }
`;

/**
 * The skills, scored for this exam alone.
 *
 * There is no per-exam skill summary on `assessmentReport`, so this asks the
 * class report for the same class and narrows it to one exam with `examIds`.
 * The figures are therefore this paper's, not the term's.
 */
const SKILLS = `
  query ($classId: ID!, $subjectId: ID!, $termId: ID!, $examIds: [ID!]) {
    classReport(classId: $classId, subjectId: $subjectId, termId: $termId, examIds: $examIds) {
      skills { skillId code name average measured }
    }
  }
`;

/**
 * The API states its report percentages as 0-100; the kit's formatter takes
 * 0-1. Dividing here, at the edge, keeps one formatter for the whole app.
 */
function pct(value, digits = 0) {
  if (value === null || value === undefined) return "—";
  return percent(value / 100, digits);
}

/** A question's own difficulty. Same boundaries the backend reports for the paper. */
function difficultyOf(averagePercent) {
  if (averagePercent === null || averagePercent === undefined) {
    return { key: "none", label: "—", text: "text-blueGray-600", bar: "bg-blueGray-300", chip: "bg-blueGray-200 text-blueGray-700" };
  }
  if (averagePercent > 75) {
    return { key: "easy", label: "Easy", text: "text-emerald-700", bar: "bg-emerald-500", chip: "bg-emerald-200 text-emerald-800" };
  }
  if (averagePercent >= 50) {
    return { key: "medium", label: "Medium", text: "text-amber-700", bar: "bg-amber-500", chip: "bg-amber-200 text-amber-800" };
  }
  return { key: "hard", label: "Hard", text: "text-red-700", bar: "bg-red-500", chip: "bg-red-200 text-red-800" };
}

const DIFFICULTY_GROUPS = [
  { key: "easy", label: "Easy", text: "text-emerald-700" },
  { key: "medium", label: "Medium", text: "text-amber-700" },
  { key: "hard", label: "Hard", text: "text-red-700" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** An ISO timestamp as "28 Sep 2026". */
function day(iso) {
  if (!iso) return "—";
  const [year, month, date] = String(iso).slice(0, 10).split("-").map(Number);
  if (!year || !month || !date) return String(iso);
  return `${date} ${MONTHS[month - 1]} ${year}`;
}

/** A JSON column entry may be an object or, from an older run, a bare string. */
function textOf(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return value.title || value.description || value.reason || "";
}

export default {
  name: "assessment-report",
  components: { AiNote, KpiRow, ReportPage, ReportSection, ReportToolbar, SkillBar, StatusBadge, VerdictCard },
  data() {
    return {
      loading: true,
      error: "",
      report: null,
      exam: null,
      insight: null,
      skills: [],
      expanded: {},
      sortKey: "averagePercent",
      sortDir: 1,
      // Under this, a question is worth reviewing before it is reteaching.
      reteachBelow: 30,
    };
  },
  computed: {
    examId() {
      return this.$route.params.examId;
    },
    classId() {
      return this.exam && this.exam.schoolClass ? this.exam.schoolClass.id : "";
    },
    subjectId() {
      return this.exam && this.exam.subject ? this.exam.subject.id : "";
    },
    termId() {
      return this.exam && this.exam.term ? this.exam.term.id : "";
    },
    heading() {
      return (this.exam && this.exam.title) || (this.report && this.report.title) || "Assessment report";
    },
    subtitle() {
      if (!this.exam) return "";
      const parts = [
        this.exam.schoolClass && this.exam.schoolClass.name,
        this.exam.subject && this.exam.subject.name,
        this.exam.term && `${this.exam.term.name} ${this.exam.term.year}`,
      ];
      return parts.filter(Boolean).join(" · ");
    },
    facts() {
      if (!this.report || !this.exam) return [];
      return [
        { label: "Class", value: this.exam.schoolClass ? this.exam.schoolClass.name : "—" },
        { label: "Subject", value: this.exam.subject ? this.exam.subject.name : "—" },
        { label: "Term", value: this.exam.term ? `${this.exam.term.name} ${this.exam.term.year}` : "—" },
        { label: "Date", value: day(this.exam.createdAt) },
        { label: "Paper", value: `${this.report.totalMarks} marks` },
        { label: "Scripts marked", value: `${this.report.markedScripts}` },
      ];
    },

    /** One sentence a teacher could say out loud, then what it rests on. */
    verdict() {
      if (!this.report) return "";
      if (this.report.mean === null) {
        return "Nothing on this paper carries a mark yet, so there is nothing to say about it.";
      }
      const parts = [
        `The class averaged ${pct(this.report.mean)} — a ${this.report.difficulty} paper.`,
      ];
      const weak = this.firstReteach;
      const hardest = this.hardestQuestion;
      if (weak) {
        parts.push(`The thing worth reteaching is ${weak.title.toLowerCase()}.`);
      } else if (hardest) {
        parts.push(`Question ${hardest.number} was the hardest, at ${pct(hardest.averagePercent)}.`);
      }
      const best = this.bestQuestion;
      if (best) {
        parts.push(`The bright spot was question ${best.number}, where the class averaged ${pct(best.averagePercent)}.`);
      }
      return parts.join(" ");
    },
    evidence() {
      if (!this.report) return [];
      const chips = [
        { label: `${this.report.markedScripts} script(s)`, classes: "bg-blueGray-200 text-blueGray-700" },
        { label: `Pass ${pct(this.report.passRate)}`, classes: "bg-blueGray-200 text-blueGray-700" },
      ];
      if (this.report.difficulty) {
        chips.push({ label: `${this.report.difficulty} paper`, classes: "bg-lightBlue-200 text-lightBlue-800" });
      }
      if (this.report.markingQuality.illegible) {
        chips.push({ label: `${this.report.markingQuality.illegible} unreadable`, classes: "bg-red-200 text-red-800" });
      }
      if (this.report.markingQuality.teacherCorrected) {
        chips.push({ label: `${this.report.markingQuality.teacherCorrected} changed by hand`, classes: "bg-amber-200 text-amber-800" });
      }
      return chips;
    },

    kpis() {
      if (!this.report) return [];
      const r = this.report;
      return [
        { label: "Mean", value: pct(r.mean), icon: "fas fa-chart-line", iconColor: "bg-lightBlue-500", hint: `Median ${pct(r.median)}` },
        { label: "Median", value: pct(r.median), icon: "fas fa-align-center", iconColor: "bg-lightBlue-400", hint: "The middle script" },
        { label: "Highest", value: pct(r.maximum), icon: "fas fa-arrow-up", iconColor: "bg-emerald-500", hint: "Best script" },
        { label: "Lowest", value: pct(r.minimum), icon: "fas fa-arrow-down", iconColor: "bg-red-500", hint: "Weakest script" },
        { label: "Pass rate", value: pct(r.passRate), icon: "fas fa-check", iconColor: "bg-amber-500", hint: "30% or better" },
        { label: "Std deviation", value: pct(r.stdDev), icon: "fas fa-arrows-alt-h", iconColor: "bg-blueGray-600", hint: "How spread the class is" },
      ];
    },
    meanLeft() {
      // Inset a little at both ends so the label never runs off the card.
      return Math.min(92, Math.max(3, this.report ? this.report.mean || 0 : 0));
    },
    distributionTakeaway() {
      if (!this.report || this.report.mean === null) {
        return "Nothing has been marked on this paper yet.";
      }
      const top = [...this.report.histogram].sort((a, b) => b.count - a.count)[0];
      return `The fullest bucket is ${top.label}, holding ${top.count} script(s).`;
    },
    difficultyTakeaway() {
      const under = this.questionsUnderThirty;
      if (!under.length) {
        return "No question averaged under 30%, so nothing here needs a second look.";
      }
      return `${under.length} question(s) averaged under 30% — those are worth a second look before the next class.`;
    },
    skillsTakeaway() {
      if (!this.skills.length) return "Skills are scored from the questions they were tagged to.";
      const weak = this.skills[0];
      return `Weakest of the ${this.skills.length} skills tested: ${weak.name}, at ${percent(weak.average)}.`;
    },
    markingTakeaway() {
      if (!this.report) return "";
      const q = this.report.markingQuality;
      if (!q.teacherCorrected) return "Every mark on this paper is the model's.";
      return "A mark a teacher decided is not the same as one the model was sure of.";
    },
    /** The sentence the card exists for. */
    markingSentence() {
      if (!this.report) return "";
      const q = this.report.markingQuality;
      const total = q.aiAccepted + q.teacherCorrected;
      if (!total) return "No answer on this paper carries a mark yet.";
      const parts = [];
      if (q.teacherCorrected) {
        const where = this.mostCorrectedQuestion
          ? `, most of them on question ${this.mostCorrectedQuestion}`
          : "";
        parts.push(
          `You changed ${q.teacherCorrected} of the ${total} marked answers (${pct(q.teacherCorrectedPercent)})${where}.`
        );
      } else {
        parts.push(`You accepted all ${q.aiAccepted} marks the model gave, without changing one.`);
      }
      if (q.illegible === 1) {
        parts.push("One answer could not be read at all.");
      } else if (q.illegible > 1) {
        parts.push(`${q.illegible} answers could not be read at all.`);
      }
      return parts.join(" ");
    },
    mostCorrectedQuestion() {
      const rows = (this.report ? this.report.questions : []).filter((row) => row.teacherCorrected > 0);
      if (!rows.length) return "";
      return rows.reduce((best, row) => (row.teacherCorrected > best.teacherCorrected ? row : best)).number;
    },

    sortedQuestions() {
      const rows = [...(this.report ? this.report.questions : [])];
      const key = this.sortKey;
      return rows.sort((a, b) => {
        const left = a[key];
        const right = b[key];
        if (left === right) return 0;
        if (typeof left === "number" && typeof right === "number") {
          return (left - right) * this.sortDir;
        }
        // Question numbers sort the way the paper is written: 2 before 10.
        const order = String(left).localeCompare(String(right), undefined, { numeric: true });
        return order * this.sortDir;
      });
    },
    difficultyGroups() {
      const rows = this.report ? this.report.questions : [];
      return DIFFICULTY_GROUPS.map((group) => ({
        ...group,
        questions: rows
          .filter((row) => difficultyOf(row.averagePercent).key === group.key)
          .sort((a, b) => a.averagePercent - b.averagePercent),
      }));
    },
    questionsUnderThirty() {
      return (this.report ? this.report.questions : []).filter((row) => row.averagePercent < 30);
    },
    hardestQuestion() {
      if (!this.report || !this.report.questions.length) return null;
      return [...this.report.questions].sort((a, b) => a.averagePercent - b.averagePercent)[0];
    },
    bestQuestion() {
      const rows = (this.report ? this.report.questions : []).filter((row) => row.maxMarks > 0);
      if (!rows.length) return null;
      return [...rows].sort((a, b) => b.averagePercent - a.averagePercent)[0];
    },

    mistakes() {
      const raw = (this.insight && this.insight.commonMistakes) || [];
      return raw
        .map((row) => ({
          description: textOf(row),
          numbers: (row && row.question_numbers) || [],
        }))
        .filter((row) => row.description);
    },
    reteach() {
      const raw = (this.insight && this.insight.reteachRecommendations) || [];
      return raw
        .map((row) => (typeof row === "string" ? { title: row, action: "", numbers: [] } : row))
        .filter((row) => row && row.title);
    },
    firstReteach() {
      return this.reteach.length ? this.reteach[0] : null;
    },
    /** `{ skillId: [question numbers] }`, so a bar can say where it came from. */
    questionsBySkill() {
      const index = {};
      const questions = (this.exam && this.exam.questions) || [];
      for (const question of questions) {
        for (const link of question.skills || []) {
          const skill = link.skill;
          if (!skill) continue;
          if (!index[skill.id]) index[skill.id] = [];
          index[skill.id].push(question.number);
        }
      }
      return index;
    },
  },
  created() {
    this.load();
  },
  methods: {
    percent,
    round,
    gradeColour,

    pct,
    clamp(value) {
      if (value === null || value === undefined) return 0;
      return Math.min(100, Math.max(0, value));
    },
    difficultyOf,

    async load() {
      this.loading = true;
      this.error = "";
      try {
        const [assessment, context, insight] = await Promise.all([
          gql(REPORT, { examId: this.examId }),
          gql(CONTEXT, { examId: this.examId }),
          // A paper can be finalised before the model has written about it.
          gql(INSIGHT, { examId: this.examId }).catch(() => ({ classInsights: null })),
        ]);
        this.report = assessment.assessmentReport;
        this.exam = context.exam;
        this.insight = insight.classInsights;
        await this.loadSkills();
      } catch (failure) {
        this.error = failure.message;
      } finally {
        this.loading = false;
      }
    },

    async loadSkills() {
      this.skills = [];
      if (!this.classId || !this.subjectId || !this.termId) return;
      try {
        const data = await gql(SKILLS, {
          classId: this.classId,
          subjectId: this.subjectId,
          termId: this.termId,
          examIds: [this.examId],
        });
        const rows = (data.classReport && data.classReport.skills) || [];
        // Only the skills this paper's own questions were tagged to. A mastery
        // row can exist for anything that has ever been scored against this
        // exam, and "skills this paper tested" has to mean tested.
        const tagged = Object.keys(this.questionsBySkill);
        const relevant = tagged.length
          ? rows.filter((skill) => tagged.indexOf(skill.skillId) !== -1)
          : rows;
        // Weakest first, and the unmeasured last: a skill with no score is not
        // a weak one.
        this.skills = [...relevant].sort((a, b) => {
          if (a.average === null && b.average === null) return 0;
          if (a.average === null) return 1;
          if (b.average === null) return -1;
          return a.average - b.average;
        });
      } catch (failure) {
        // The rest of the report is still worth reading.
        this.skills = [];
      }
    },

    sortBy(key) {
      if (this.sortKey === key) {
        this.sortDir = -this.sortDir;
        return;
      }
      this.sortKey = key;
      this.sortDir = 1;
    },
    ariaSort(key) {
      if (this.sortKey !== key) return "none";
      return this.sortDir === 1 ? "ascending" : "descending";
    },
    sortIcon(key) {
      if (this.sortKey !== key) return "fa-sort text-blueGray-300";
      return this.sortDir === 1 ? "fa-sort-up" : "fa-sort-down";
    },
    toggle(number) {
      // Plain assignment: Vue 3's reactivity covers keys added after the fact,
      // so there is no `$set` here to reach for.
      this.expanded[number] = !this.expanded[number];
    },

    skillsFor(number) {
      const question = ((this.exam && this.exam.questions) || []).find((row) => row.number === number);
      if (!question) return [];
      return (question.skills || []).map((link) => link.skill).filter(Boolean);
    },
    rubricFor(number) {
      return (this.report ? this.report.rubricItems : [])
        .filter((item) => item.questionNumber === number)
        .map((item, index) => ({ ...item, key: `${item.questionNumber}-${index}-${item.description}` }));
    },
    mistakeFor(number) {
      const found = this.mistakes.find((row) => row.numbers.indexOf(number) !== -1);
      return found ? found.description : "";
    },
    hardestReason(number) {
      const rows = (this.insight && this.insight.hardestQuestions) || [];
      const found = rows.find((row) => row && String(row.number) === String(number));
      return found ? textOf(found) : "";
    },
    skillLabel(skill) {
      const numbers = this.questionsBySkill[skill.skillId] || [];
      const where = numbers.length ? ` · Q${numbers.join(", Q")}` : "";
      return `${skill.name}${where}`;
    },

    print() {
      printPage();
    },

    /** The table, as a spreadsheet: the same columns, in the order shown. */
    exportCsv() {
      const rows = [
        [`${this.heading} — ${this.subtitle}`],
        [],
        ["Mean", round(this.report.mean, 1), "Median", round(this.report.median, 1), "Pass rate", round(this.report.passRate, 1)],
        ["Highest", round(this.report.maximum, 1), "Lowest", round(this.report.minimum, 1), "Std dev", round(this.report.stdDev, 1)],
        ["Difficulty", this.report.difficulty, "Scripts marked", this.report.markedScripts],
        [],
        ["Question", "Skills", "Max marks", "Average", "Average %", "Full marks %", "Zero %", "Blank %", "Difficulty", "Most common mistake", "Changed by a teacher"],
        ...this.sortedQuestions.map((row) => [
          row.number,
          this.skillsFor(row.number).map((skill) => skill.code).join(" "),
          row.maxMarks,
          round(row.average, 2),
          round(row.averagePercent, 1),
          round(row.percentFull, 1),
          round(row.percentZero, 1),
          round(row.percentBlank, 1),
          difficultyOf(row.averagePercent).label,
          row.mostCommonError,
          row.teacherCorrected,
        ]),
        [],
        ["Rubric item", "Question", "Marks", "Offered", "Awarded", "Award rate %"],
        ...(this.report.rubricItems || []).map((item) => [
          item.description,
          item.questionNumber,
          item.marks,
          item.offered,
          item.awarded,
          round(item.awardRate, 1),
        ]),
      ];
      exportRows(`${this.heading} — assessment.csv`, rows);
    },
  },
};
</script>

<style scoped>
/*
 * Paper.
 *
 * The kit asks for `print:` utilities (`print:shadow-none`, `print:mb-4`) but
 * Tailwind 2.0.4 here does not generate them, so a report that leaned on them
 * printed with every shadow, every gap and a column layout that never applied:
 * A4 portrait is 794px wide on paper, and every multi-column rule in the page
 * was written for `lg:` at 1024px. The result was five sheets for one exam.
 *
 * These rules are the ones that actually matter for this report, stated where
 * they can be seen next to the markup they describe.
 */
@media print {
  /*
   * Paper is not a screen. The app's generous padding is for touch targets and
   * hover states; on a sheet it is just height, and the eight sections of an
   * assessment report have to share two of them.
   */
  .report-page .p-4 {
    padding: 8px;
  }

  .report-page .py-3 {
    padding-top: 6px;
    padding-bottom: 6px;
  }

  .report-page h2 {
    font-size: 15px;
  }

  .report-page h5 {
    font-size: 11px;
  }

  .report-section {
    margin-bottom: 6px;
  }

  /*
   * The question table is the one block allowed to run over a page edge.
   * A table is built to be read in parts -- rows stay whole, because
   * `index.css` holds `tr` together -- and holding the whole section back
   * wasted a third of a sheet every time it did not fit. Everything shorter
   * stays in one piece.
   */
  .assess-breakable {
    break-inside: auto;
    page-break-inside: auto;
  }

  /* A chevron does nothing on paper, and 44px of it per row is height a
     printed table cannot spare. */
  .assess-toggle {
    display: none;
  }

  /* Six headline figures fit one row on paper; they wrap to three on screen.
     Prefixed with `.report-page` and marked important so it still beats the
     shared sheet's column rule for `md:w-4/12`. */
  .report-page .assess-kpis > div {
    width: 16.6667% !important;
  }

  /* The icon disc is half the height of a KPI card and says nothing the label
     does not. */
  .assess-kpis :deep(.rounded-full) {
    display: none;
  }

  /*
   * The columns, stated for paper rather than borrowed from a breakpoint.
   *
   * A4 portrait minus the 14mm margins is 182mm, which is 688px: below `md`,
   * below `lg`, and below every width these grids were written for. Left to
   * the screen rules, a printed report fell into one long column and ran to
   * three sheets. These few lines are what puts it back on two.
   */
  .assess-facts {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .assess-difficulty > div {
    width: 33.3333%;
  }

  .assess-detail > div,
  .assess-skills > div {
    width: 50%;
  }

  /* A chart tall enough to read on paper, short enough to share a sheet. */
  .assess-chart {
    height: 96px;
  }

  /* Cards keep an outline on paper: a shadow prints as nothing at all. */
  .report-page .bg-white {
    box-shadow: none;
    border: 1px solid #e2e8f0;
  }
}
</style>
