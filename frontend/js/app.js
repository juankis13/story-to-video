document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("storyForm");
  const contentField = document.getElementById("content");
  const charCount = document.getElementById("charCount");
  const submitBtn = document.getElementById("submitBtn");
  const progressSection = document.getElementById("progressSection");
  const progressBar = document.getElementById("progressBar");
  const progressMessage = document.getElementById("progressMessage");
  const progressPercent = document.getElementById("progressPercent");
  const progressTitle = document.getElementById("progressTitle");
  const progressBadge = document.getElementById("progressBadge");
  const videoResult = document.getElementById("videoResult");
  const videoPlayer = document.getElementById("videoPlayer");
  const downloadLink = document.getElementById("downloadLink");
  const errorMessage = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");
  const newVideoBtn = document.getElementById("newVideoBtn");
  const retryBtn = document.getElementById("retryBtn");

  // Preview elements
  const previewBody = document.getElementById("previewBody");
  const previewBar = document.getElementById("previewBar");
  const previewText = document.getElementById("previewText");
  const dot1 = document.getElementById("dot1");
  const dot2 = document.getElementById("dot2");
  const dot3 = document.getElementById("dot3");

  // Color inputs
  const bgColor = document.getElementById("bgColor");
  const textColor = document.getElementById("textColor");
  const accentColor = document.getElementById("accentColor");

  let pollInterval = null;

  // Character count
  contentField.addEventListener("input", () => {
    const len = contentField.value.length;
    charCount.textContent = `${len.toLocaleString()} / 50,000`;
  });

  // Live preview update
  function updatePreview() {
    const bg = bgColor.value;
    const text = textColor.value;
    const accent = accentColor.value;

    previewBody.style.backgroundColor = bg;
    previewBar.style.backgroundColor = accent;
    previewText.style.color = text;
    dot1.style.backgroundColor = accent;
    dot2.style.backgroundColor = accent;
    dot3.style.backgroundColor = accent;

    const title = document.getElementById("title").value;
    if (title) {
      previewText.textContent = title;
    } else {
      previewText.textContent = "Tu historia aparecerá aquí...";
    }
  }

  bgColor.addEventListener("input", updatePreview);
  textColor.addEventListener("input", updatePreview);
  accentColor.addEventListener("input", updatePreview);
  document.getElementById("title").addEventListener("input", updatePreview);

  // Initial preview
  updatePreview();

  // Format radio buttons
  document.querySelectorAll(".format-option input").forEach((radio) => {
    radio.addEventListener("change", () => {
      document.querySelectorAll(".format-option").forEach((opt) => {
        opt.classList.remove("active");
      });
      radio.closest(".format-option").classList.add("active");
    });
  });

  // Form submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = {
      title: document.getElementById("title").value.trim(),
      content: contentField.value.trim(),
      author: document.getElementById("author").value.trim() || "Anónimo",
      language: document.getElementById("language").value,
      video_format: document.querySelector(
        'input[name="video_format"]:checked'
      ).value,
      bg_color: bgColor.value,
      text_color: textColor.value,
      accent_color: accentColor.value,
    };

    if (!formData.title || !formData.content) {
      alert("Por favor, completa el título y la historia.");
      return;
    }

    if (formData.content.length < 10) {
      alert("La historia debe tener al menos 10 caracteres.");
      return;
    }

    // Show progress, hide form
    form.classList.add("hidden");
    progressSection.classList.remove("hidden");
    videoResult.classList.add("hidden");
    errorMessage.classList.add("hidden");

    // Reset progress
    progressBar.style.width = "0%";
    progressPercent.textContent = "0%";
    progressMessage.textContent = "Enviando historia...";
    progressBadge.textContent = "En proceso";
    progressBadge.className = "progress-badge";

    submitBtn.disabled = true;

    try {
      const response = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Error al enviar la historia");
      }

      const data = await response.json();
      startPolling(data.id);
    } catch (err) {
      showError(err.message);
    }
  });

  function startPolling(storyId) {
    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/stories/${storyId}/status`);
        if (!res.ok) throw new Error("Error al verificar estado");

        const data = await res.json();
        updateProgress(data);

        if (data.status === "done") {
          clearInterval(pollInterval);
          pollInterval = null;
          showVideoResult(data);
        } else if (data.status === "error") {
          clearInterval(pollInterval);
          pollInterval = null;
          showError(data.message);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 1500);
  }

  function updateProgress(data) {
    progressBar.style.width = `${data.progress_percent}%`;
    progressPercent.textContent = `${data.progress_percent}%`;
    progressMessage.textContent = data.message;

    const statusLabels = {
      queued: "En cola",
      processing: "Procesando",
      generating_audio: "Generando audio",
      composing_video: "Componiendo video",
      done: "Completado",
      error: "Error",
    };

    progressBadge.textContent = statusLabels[data.status] || data.status;
  }

  function showVideoResult(data) {
    progressTitle.textContent = "¡Tu video está listo!";
    progressBadge.textContent = "Completado";
    progressBadge.className = "progress-badge done";
    progressBar.style.width = "100%";
    progressPercent.textContent = "100%";
    progressMessage.textContent = "Video generado exitosamente";

    videoResult.classList.remove("hidden");
    videoPlayer.src = data.video_url;
    downloadLink.href = data.video_url;
    downloadLink.download = "historia_video.mp4";
  }

  function showError(message) {
    progressTitle.textContent = "Error al generar el video";
    progressBadge.textContent = "Error";
    progressBadge.className = "progress-badge error";

    errorMessage.classList.remove("hidden");
    errorText.textContent = message;
    submitBtn.disabled = false;
  }

  // New video button
  newVideoBtn.addEventListener("click", () => {
    form.classList.remove("hidden");
    progressSection.classList.add("hidden");
    submitBtn.disabled = false;
    form.reset();
    updatePreview();
    charCount.textContent = "0 / 50,000";
  });

  // Retry button
  retryBtn.addEventListener("click", () => {
    form.classList.remove("hidden");
    progressSection.classList.add("hidden");
    submitBtn.disabled = false;
  });
});
