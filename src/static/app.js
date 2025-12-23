document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // helper to safely escape user-provided strings
  function escapeHtml(unsafe) {
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // build participants markup (list or fallback message) and render them safely
        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants-section">
            <h5>Participants (${details.participants.length})</h5>
            <div class="participants-container"></div>
          </div>
        `;

        // Append card to DOM then populate participants safely
        activitiesList.appendChild(activityCard);

        const participantsContainer = activityCard.querySelector('.participants-container');

        if (details.participants && details.participants.length) {
          const ul = document.createElement('ul');
          ul.className = 'participants-list';

          const maxToShow = 8;
          const toShow = details.participants.slice(0, maxToShow);

          toShow.forEach((p) => {
            const li = document.createElement('li');
            li.className = 'participant-item';

            const span = document.createElement('span');
            span.className = 'participant-email';
            span.textContent = p;

            const btn = document.createElement('button');
            btn.className = 'delete-btn';
            btn.type = 'button';
            btn.setAttribute('title', `Remove ${p}`);
            btn.setAttribute('aria-label', `Remove ${p}`);
            btn.innerHTML = '&times;';
            // store data for handler
            btn.dataset.activity = name;
            btn.dataset.email = p;

            li.appendChild(span);
            li.appendChild(btn);
            ul.appendChild(li);
          });

          if (details.participants.length > maxToShow) {
            const remaining = details.participants.length - maxToShow;
            const li = document.createElement('li');
            li.className = 'more-indicator';
            li.textContent = `+${remaining} more`;
            ul.appendChild(li);
          }

          participantsContainer.appendChild(ul);
        } else {
          const p = document.createElement('p');
          p.className = 'no-participants';
          p.textContent = 'No participants yet.';
          participantsContainer.appendChild(p);
        }

        // Attach delete handler via event delegation on the card
        activityCard.addEventListener('click', async (e) => {
          if (e.target && e.target.classList.contains('delete-btn')) {
            const activityName = e.target.dataset.activity;
            const email = e.target.dataset.email;
            if (!activityName || !email) return;
            try {
              const res = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
              if (res.ok) {
                // refresh activities to reflect changes
                fetchActivities();
              } else {
                const err = await res.json();
                console.error('Failed to remove participant:', err);
                messageDiv.textContent = err.detail || 'Failed to remove participant';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 5000);
              }
            } catch (err) {
              console.error('Error removing participant:', err);
            }
          }
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();
        // Refresh activities immediately so the new participant shows up
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
