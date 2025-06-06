document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("transcript-form")
  const generateBtn = document.getElementById("generate-btn")
  const spinner = document.getElementById("spinner")
  const errorContainer = document.getElementById("error-container")
  const resultsContainer = document.getElementById("results-container")
  const rawJsonContainer = document.getElementById("raw-json")
  const gptResponseContainer = document.getElementById("gpt-response")
  const audioFileInput = document.getElementById("audio-file")
  const transcriptInput = document.getElementById("transcript")

  // Result section elements
  const chiefComplaintEl = document.getElementById("chief-complaint")
  const historyEl = document.getElementById("history")
  const assessmentEl = document.getElementById("assessment")
  const planEl = document.getElementById("plan")

  const dropZone = document.getElementById("drop-zone")
  const fileUploadContent = dropZone.querySelector(".file-upload-content")
  const fileUploadPreview = dropZone.querySelector(".file-upload-preview")
  const fileName = fileUploadPreview.querySelector(".file-name")
  const removeFileBtn = fileUploadPreview.querySelector(".remove-file")

  // API configuration
  const API_CONFIG = {
    baseUrl: "/api",
    endpoint: "/relay",
    headers: {
      "Content-Type": "application/json"
    }
  }

  // Initialize collapsible sections
  document.querySelectorAll(".section-header").forEach(header => {
    header.addEventListener("click", () => {
      const section = header.closest(".section")
      section.classList.toggle("collapsed")
    })
  })

  // Initialize drag and drop
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault()
    dropZone.classList.add("drag-over")
  })

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over")
  })

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault()
    dropZone.classList.remove("drag-over")
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelection(file)
    }
  })

  // Handle file selection
  function handleFileSelection(file) {
    // Validate file size (25MB limit)
    if (file.size > 25 * 1024 * 1024) {
      showError("File size exceeds 25MB limit")
      return
    }

    // Validate file type
    const validTypes = ["audio/mpeg", "audio/wav", "audio/x-m4a"]
    if (!validTypes.includes(file.type)) {
      showError("Invalid file type. Please upload MP3, WAV, or M4A files")
      return
    }

    // Update UI
    audioFileInput.files = new DataTransfer().files
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    audioFileInput.files = dataTransfer.files

    // Show file preview
    fileName.textContent = file.name
    fileUploadContent.classList.add("hidden")
    fileUploadPreview.classList.remove("hidden")
    
    // Clear transcript
    transcriptInput.value = ""
  }

  // Handle file input change
  audioFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileSelection(file)
    }
  })

  // Handle remove file button
  removeFileBtn.addEventListener("click", () => {
    audioFileInput.value = ""
    fileUploadContent.classList.remove("hidden")
    fileUploadPreview.classList.add("hidden")
  })

  // Handle transcript input
  transcriptInput.addEventListener("input", () => {
    if (transcriptInput.value.trim()) {
      audioFileInput.value = ""
    }
  })

  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    const file = audioFileInput.files[0]
    const transcript = transcriptInput.value.trim()

    if (!file && !transcript) {
      showError("Please upload an audio file or enter a transcript")
      return
    }

    // Show loading state
    setLoading(true)
    hideError()
    hideResults()
    hideRawResponses()

    try {
      let response
      
      if (file) {
        // Handle audio file upload
        const formData = new FormData()
        formData.append("file", file)

        response = await fetch(`${API_CONFIG.baseUrl}/transcribe`, {
          method: "POST",
          headers: {
            "X-API-Key": process.env.NEXT_PUBLIC_API_KEY || ""
          },
          body: formData
        })
      } else {
        // Handle transcript submission
        response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoint}`, {
          method: "POST",
          headers: API_CONFIG.headers,
          body: JSON.stringify({ transcript })
        })
      }

      // Handle different response statuses
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.")
      } else if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Server error: ${response.status}`)
      }

      // Parse response
      const data = await response.json()

      // Validate response data
      if (!data || typeof data !== "object") {
        throw new Error("Invalid response format from server")
      }

      // Display formatted results
      displayResults(data)

      // Display raw responses
      displayRawResponses(data)
    } catch (error) {
      console.error("Error processing request:", error)
      showError(error.message || "Failed to process request. Please try again.")
    } finally {
      setLoading(false)
    }
  })

  function setLoading(isLoading) {
    if (isLoading) {
      generateBtn.disabled = true
      spinner.style.display = "block"
      generateBtn.querySelector("span").textContent = file ? "Processing Audio..." : "Processing Transcript..."
      
      // Show loading overlay
      const overlay = document.createElement("div")
      overlay.className = "loading-overlay visible"
      overlay.innerHTML = `
        <div class="loading-message">
          <div class="spinner"></div>
          <p>${file ? "Transcribing audio..." : "Processing transcript..."}</p>
        </div>
      `
      document.body.appendChild(overlay)
    } else {
      generateBtn.disabled = false
      spinner.style.display = "none"
      generateBtn.querySelector("span").textContent = "Process Audio/Transcript"
      
      // Remove loading overlay
      const overlay = document.querySelector(".loading-overlay")
      if (overlay) {
        overlay.remove()
      }
    }
  }

  function showError(message) {
    errorContainer.textContent = message
    errorContainer.classList.remove("hidden")
  }

  function hideError() {
    errorContainer.classList.add("hidden")
    errorContainer.textContent = ""
  }

  function hideResults() {
    resultsContainer.classList.add("hidden")
  }

  function hideRawResponses() {
    if (rawJsonContainer) {
      rawJsonContainer.classList.add("hidden")
    }
    if (gptResponseContainer) {
      gptResponseContainer.classList.add("hidden")
    }
  }

  // Dynamic JSON rendering
  function renderDynamicResults(data) {
    const container = document.getElementById("dynamic-results")
    container.innerHTML = ""

    // Group fields by category
    const categories = {
      "Patient Information": ["age", "sex", "race", "ethnicity"],
      "Clinical Note": ["chief_complaint", "history_of_present_illness", "assessment", "plan"],
      "CPT Codes": ["recommended_cpt_codes"],
      "QPP Measures": ["qpp_measures"],
      "Other Information": [] // Catch-all for other fields
    }

    // Helper function to create a section
    function createSection(title, fields) {
      const section = document.createElement("div")
      section.className = "result-section"
      
      const header = document.createElement("div")
      header.className = "result-section-header"
      header.innerHTML = `
        <h3>${title}</h3>
        <button class="collapse-btn" aria-label="Toggle section">▼</button>
      `
      
      const content = document.createElement("div")
      content.className = "result-section-content"

      // Add fields to section
      let hasContent = false
      fields.forEach(field => {
        const value = data[field]
        if (value != null && value !== "Not specified") {
          hasContent = true
          if (Array.isArray(value)) {
            // Handle arrays (CPT codes, QPP measures)
            const arrayContainer = document.createElement("div")
            arrayContainer.className = "array-container"
            
            value.forEach(item => {
              const itemElement = document.createElement("div")
              itemElement.className = "array-item"
              
              if (field === "recommended_cpt_codes") {
                // Special handling for CPT codes
                const statusClass = item.lcd_status?.toLowerCase().replace(/\s+/g, "-") || ""
                itemElement.innerHTML = `
                  <div class="array-item-header">
                    <strong>${item.code}</strong>: ${item.description}
                  </div>
                  <div class="array-item-content">
                    <p>LCD Required: ${item.requires_lcd ? "Yes" : "No"}</p>
                    ${item.lcd_code ? `<p>LCD Code: ${item.lcd_code}</p>` : ""}
                    ${item.lcd_status ? `
                      <p>LCD Status: 
                        <span class="status-tag ${statusClass}">${item.lcd_status}</span>
                      </p>
                    ` : ""}
                  </div>
                `
              } else {
                // Generic array item display
                itemElement.innerHTML = `
                  <div class="array-item-content">
                    ${Object.entries(item).map(([key, val]) => `
                      <p><strong>${formatFieldName(key)}:</strong> ${val}</p>
                    `).join("")}
                  </div>
                `
              }
              arrayContainer.appendChild(itemElement)
            })
            content.appendChild(arrayContainer)
          } else if (typeof value === "object") {
            // Handle objects
            const fieldGroup = document.createElement("div")
            fieldGroup.className = "field-group"
            fieldGroup.innerHTML = `
              <div class="field-label">${formatFieldName(field)}</div>
              <div class="field-value">
                ${Object.entries(value).map(([key, val]) => `
                  <p><strong>${formatFieldName(key)}:</strong> ${val}</p>
                `).join("")}
              </div>
            `
            content.appendChild(fieldGroup)
          } else {
            // Handle simple values
            const fieldGroup = document.createElement("div")
            fieldGroup.className = "field-group"
            fieldGroup.innerHTML = `
              <div class="field-label">${formatFieldName(field)}</div>
              <div class="field-value">${value}</div>
            `
            content.appendChild(fieldGroup)
          }
        }
      })

      // Only add section if it has content
      if (hasContent) {
        section.appendChild(header)
        section.appendChild(content)
        container.appendChild(section)

        // Add collapse functionality
        header.addEventListener("click", () => {
          section.classList.toggle("collapsed")
        })
      }
    }

    // Helper function to format field names
    function formatFieldName(name) {
      return name
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    }

    // Create sections for each category
    Object.entries(categories).forEach(([title, fields]) => {
      createSection(title, fields)
    })

    // Add any remaining fields to "Other Information"
    const usedFields = Object.values(categories).flat()
    const otherFields = Object.keys(data).filter(field => !usedFields.includes(field))
    if (otherFields.length > 0) {
      categories["Other Information"] = otherFields
      createSection("Other Information", otherFields)
    }
  }

  // Update the displayResults function to use dynamic rendering
  function displayResults(data) {
    try {
      renderDynamicResults(data)
      resultsContainer.classList.remove("hidden")
      resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" })
    } catch (error) {
      console.error("Error displaying results:", error)
      showError("Error displaying results. Please try again.")
    }
  }

  function displayRawResponses(data) {
    try {
      // Display API response
      if (rawJsonContainer) {
        const formattedJson = JSON.stringify(data, null, 2)
        rawJsonContainer.textContent = formattedJson
        rawJsonContainer.classList.remove("hidden")
      }

      // Display GPT response if available
      if (gptResponseContainer && data.gpt_response) {
        const formattedGptResponse = typeof data.gpt_response === 'string' 
          ? data.gpt_response 
          : JSON.stringify(data.gpt_response, null, 2)
        gptResponseContainer.textContent = formattedGptResponse
        gptResponseContainer.classList.remove("hidden")
      }
    } catch (error) {
      console.error("Error displaying raw responses:", error)
    }
  }
})
