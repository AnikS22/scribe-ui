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

  // Handle file input change
  audioFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) {
      // Clear transcript when file is selected
      transcriptInput.value = ""
      
      // Validate file size (25MB limit)
      if (file.size > 25 * 1024 * 1024) {
        showError("File size exceeds 25MB limit")
        audioFileInput.value = ""
        return
      }

      // Validate file type
      const validTypes = ["audio/mpeg", "audio/wav", "audio/x-m4a"]
      if (!validTypes.includes(file.type)) {
        showError("Invalid file type. Please upload MP3, WAV, or M4A files")
        audioFileInput.value = ""
        return
      }
    }
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

  function displayResults(data) {
    try {
      // Only display non-null fields
      const sections = {
        "chief-complaint": data.chief_complaint,
        "history": data.history_of_present_illness,
        "assessment": data.assessment,
        "plan": data.plan
      }

      // Update each section
      Object.entries(sections).forEach(([id, content]) => {
        const element = document.getElementById(id)
        const section = element.closest(".section")
        
        if (content && content !== "Not specified") {
          element.textContent = content
          section.classList.remove("hidden")
        } else {
          section.classList.add("hidden")
        }
      })

      // Display CPT codes
      const cptContainer = document.getElementById("cpt-results")
      const cptSection = cptContainer.closest(".section")
      
      if (Array.isArray(data.recommended_cpt_codes) && data.recommended_cpt_codes.length > 0) {
        cptContainer.innerHTML = ""
        data.recommended_cpt_codes.forEach((cpt) => {
          const item = document.createElement("div")
          item.className = "cpt-box"
          
          // Determine LCD status class
          let lcdStatusClass = "text-gray-600"
          let lcdStatusIcon = "❓"
          
          if (cpt.lcd_status) {
            switch(cpt.lcd_status.toLowerCase()) {
              case "meets":
                lcdStatusClass = "text-green-600"
                lcdStatusIcon = "✅"
                break
              case "partially meets":
                lcdStatusClass = "text-yellow-600"
                lcdStatusIcon = "⚠️"
                break
              case "does not meet":
                lcdStatusClass = "text-red-600"
                lcdStatusIcon = "❌"
                break
            }
          }

          // Create LCD status text
          const lcdStatusText = cpt.lcd_status || "Not evaluated"
          
          // Create LCD code text
          const lcdCodeText = cpt.lcd_code 
            ? `✅ Yes – ${cpt.lcd_code}`
            : "❌ No LCD required"

          item.innerHTML = `
            <div class="cpt-header">
              <strong>CPT Code:</strong> ${cpt.code} – ${cpt.description}
            </div>
            <div class="cpt-details">
              <p><strong>Requires LCD:</strong> ${lcdCodeText}</p>
              <p><strong>LCD Status:</strong> ${lcdStatusIcon} <span class="${lcdStatusClass}">${lcdStatusText}</span></p>
            </div>
          `
          cptContainer.appendChild(item)
        })
        cptSection.classList.remove("hidden")
      } else {
        cptSection.classList.add("hidden")
      }

      // Show results container
      resultsContainer.classList.remove("hidden")

      // Scroll to results with smooth behavior
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
