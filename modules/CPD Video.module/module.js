function getVideoId() {
  const originalEmbed = document.querySelector(".embed_container");
  if (!originalEmbed) {
    console.error("Original element '.embed_container' not found.");
    return null;
  }

  const clonedEmbed = originalEmbed.cloneNode(true);
  clonedEmbed.id = "notes_embed_container";

  const iframeSrc = clonedEmbed.querySelector("iframe")?.getAttribute("src");
  const videoId = iframeSrc?.match(/vimeo\.com\/video\/(\d+)/)?.[1];

  if (!videoId) {
    console.error("Vimeo video ID not found.");
    return null;
  }

  console.log("🎥 Vimeo Video ID:", videoId);

  document.querySelector(".cpd-records .video-container")?.appendChild(clonedEmbed);
  return videoId;
}

async function fetchExistingRecord(contactId, videoId) {
  try {
    const response = await fetch("https://community.drawingandtalking.com/_hcms/api/search-cpd-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, videoId }),
    });

    return await response.json();
  } catch (error) {
    console.error("Error checking existing record:", error);
    return null;
  }
}

function disableButton(button, text) {
  if (button) {
    button.innerHTML = text;
    button.disabled = true;
  }
}

function updateToggleButton(existingData, toggleBtn) {
  if (existingData?.exists) {
    disableButton(toggleBtn, "Video already marked as watched video");
  } else {
    toggleBtn.disabled = false;
    toggleBtn.innerText = "Take notes and mark video as watched." 
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const videoId = getVideoId();
  if (!videoId) return;

  const contactId = document.querySelector(".cpd-records-reveal-btn")?.getAttribute("data-contactid");
  if (!contactId) {
    console.error("User contact ID not found. Please log in and try again.");
    return;
  }

  const toggleBtn = document.getElementById("toggle-btn");
  disableButton(toggleBtn, "Checking...");

  let existingData = await fetchExistingRecord(contactId, videoId);
  updateToggleButton(existingData, toggleBtn);

  document.querySelector(".cpd-records .submit-btn")?.addEventListener("click", async () => {
    const watched = document.querySelector("#watched")?.checked ?? false;
    if (!watched) {
      alert("Please confirm that you watched the video before submitting feedback.");
      return;
    }

    const recordData = {
      recordName: document.title?.trim().replace(/["<>]/g, "") || "Untitled Video",
      hubdbRecordId: existingData?.hubdbRecordId,
      submissionDate: new Date().setUTCHours(0, 0, 0, 0),
      rating: document.querySelector("input[name='rating']:checked")?.value ?? null,
      comment: document.querySelector("#notes")?.value.trim() ?? "",
      feedback: document.querySelector("#feedback")?.value.trim() ?? "",
      watched,
      contactId,
    };

    if (!existingData?.exists) {
      const createResult = await createCPDRecord(recordData);
      if (createResult.success) {
        document.querySelector(".cpd-records").style.display = "none";
      } else {
        console.log("CPD Record Creation Failed:", createResult.message);
      }
    } else {
      disableButton(document.querySelector("#warning"), `<p style="color: red; margin-bottom: 5px;">A record already exists.</p>`)
      disableButton(document.querySelector(".cpd-records .submit-btn"), "Can't submit duplicate entries.");
    }
  });
});

async function createCPDRecord(recordData) {
  const submitBtn = document.querySelector(".cpd-records .submit-btn");
  disableButton(submitBtn, "Submitting...");

  try {
    const response = await fetch("https://community.drawingandtalking.com/_hcms/api/create-cpd-record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recordData),
    });

    const data = await response.json();

    if (response.status === 409) {
      console.warn("CPD record already exists.");
      document.querySelector("#warning")?.insertAdjacentHTML("beforeend", `<p>${data}</p>`);
      disableButton(document.getElementById("toggle-btn"), "Video already marked as watched");
      return { success: false, message: "A CPD record already exists for this video." };
    }

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}, Response: ${JSON.stringify(data)}`);
    }

    disableButton(document.getElementById("toggle-btn"), "Successfully marked as watched video");
    return { success: true, id: data.id, message: "CPD record created successfully." };
  } catch (error) {
    console.error("Error in createCPDRecord:", error);
    return { success: false, error: error.message };
  }
}