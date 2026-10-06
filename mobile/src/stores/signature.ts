import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSignatureTempStore = defineStore('signatureTemp', () => {
  const tempSignatureImage = ref<string | null>(null)
  const tempSaveSignature = ref(false)

  function setTemp(dataUrl: string, save: boolean) {
    tempSignatureImage.value = dataUrl
    tempSaveSignature.value = save
  }

  function consumeTemp(): { image: string; save: boolean } | null {
    const image = tempSignatureImage.value
    const save = tempSaveSignature.value
    if (!image) return null
    tempSignatureImage.value = null
    tempSaveSignature.value = false
    return { image, save }
  }

  function clearTemp() {
    tempSignatureImage.value = null
    tempSaveSignature.value = false
  }

  return { tempSignatureImage, tempSaveSignature, setTemp, consumeTemp, clearTemp }
})
