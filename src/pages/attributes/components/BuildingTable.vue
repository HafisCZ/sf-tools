<template>
  <div>
    <SFHeading level="5" class="mb-[14px]">{{ props.title }}</SFHeading>
    <SFTable dense>
      <template #header>
        <SFTableRow>
          <SFTableHeader v-for="(column, index) in props.columns" :key="index" align="center" :style="{ width: column.width }">
            {{ column.label }}
          </SFTableHeader>
        </SFTableRow>
      </template>
      <SFTableRow v-for="(row, index) in props.rows" :key="index">
        <SFTableCell v-for="(cell, cellIndex) in row" :key="cellIndex" align="center">
          {{ cell }}
        </SFTableCell>
      </SFTableRow>
    </SFTable>
  </div>
</template>

<script setup lang="ts">
import SFHeading from '@library/SFHeading.vue'
import SFTable from '@library/SFTable.vue'
import SFTableCell from '@library/SFTableCell.vue'
import SFTableHeader from '@library/SFTableHeader.vue'
import SFTableRow from '@library/SFTableRow.vue'

defineOptions({
  name: 'BuildingTable'
})

const props = defineProps<{
  /**
   * Name of the building, shown above the table
   */
  title: string
  /**
   * Header of each column, with the width it takes
   */
  columns: { label: string; width?: string }[]
  /**
   * Rows of already formatted cells, one value per column
   */
  rows: string[][]
}>()
</script>
