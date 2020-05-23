<template lang="pug">
client-only
  codemirror(v-model="modelVal" ref="codemirror" @input="onCmCodeChange" @ready="$emit('ready')")
</template>

<script lang="ts">
import { Vue, Component, Prop, Emit } from 'nuxt-property-decorator'
import { Editor } from 'codemirror'

@Component
export default class MarkdownEditor extends Vue {
  @Prop({ default: '' }) value!: string

  modelVal = ''

  get codemirror() {
    if (this.$refs.codemirror) {
      return (this.$refs.codemirror as any).codemirror as Editor
    }

    return null
  }

  mounted() {
    const codemirror = this.codemirror

    if (codemirror) {
      codemirror.setSize('100%', '100%')
      ;(codemirror as any).on(
        'paste',
        async (ins: Editor, evt: ClipboardEvent) => {
          const { items } = evt.clipboardData || ({} as any)
          if (items) {
            for (const k of Object.keys(items)) {
              const item = items[k] as DataTransferItem
              if (item.kind === 'file') {
                evt.preventDefault()
                const blob = item.getAsFile()!
                const cursor = ins.getCursor()
                const filename = new Date().toISOString()

                const r = await this.$fireStorage.ref(filename).put(blob)
                ins
                  .getDoc()
                  .replaceRange(`![${filename}](${r.downloadURL})`, cursor)
              }
            }
          }
        }
      )
    }
  }

  @Emit('input')
  onCmCodeChange() {
    return this.modelVal
  }
}
</script>
