document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("transcript-form");
  const generateBtn = document.getElementById("generate-btn");
  const spinner = document.getElementById("spinner");
  const errorContainer = document.getElementById("error-container");
  const resultsContainer = document.getElementById("results-container");

  const chiefComplaintEl = document.getElementById("chief-complaint");
  const historyEl = document.getElementById("history");
  const assessmentEl = document.getElementById("assessment");
  const planEl = document.getElementById("plan");

  const API_ENDPOINT = "/api/relay";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const transcript = document.getElementById("transcript").value.trim();

    if (!transcript) {
      showError("Please enter a patient transcript.");
      return;
    }

    setLoading(true);
    hideError();
    hideResults();

    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ transcript })
      });

      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      } else if (response.status === 401) {
        throw new Error("Unauthorized. Please check your API key.");
      } else if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!data || typeof data !== "object") {
        throw new Error("Invalid response format from server.");
      }

      displayResults(data);
    } catch (error) {
      console.error("❌ Transcript processing failed:", error);
      showError(error.message || "Failed to process transcript. Please try again.");
    } finally {
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    spinner.style.display = isLoading ? "block" : "none";
    generateBtn.querySelector("span").textContent = isLoading ? "Processing..." : "Generate Note";
  }

  function showError(message) {
    errorContainer.textContent = message;
    errorContainer.classList.remove("hidden");
  }

  function hideError() {
    errorContainer.textContent = "";
    errorContainer.classList.add("hidden");
  }

  function hideResults() {
    resultsContainer.classList.add("hidden");
  }

  function displayResults(data) {
    try {
      chiefComplaintEl.textContent = data.chief_complaint || "Not specified";
      historyEl.textContent = data.history_of_present_illness || "Not specified";
      assessmentEl.textContent = data.assessment || "Not specified";
      planEl.textContent = data.plan || "Not specified";

      resultsContainer.classList.remove("hidden");
      resultsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      console.error("⚠️ Display error:", error);
      showError("Error displaying results. Please try again.");
    }
  }
});
