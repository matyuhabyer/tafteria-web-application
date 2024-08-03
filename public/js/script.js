// Sidebar Toggle
function toggleSidebar() {
    var sidebar = document.getElementById("sidebar");
    if (sidebar.style.width === "0px" || sidebar.style.width === "") {
        sidebar.style.width = "250px";
    } else {
        sidebar.style.width = "0";
    }
}

//WRITE A REVIEW
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('ratingModal');
    const openModalBtn = document.getElementById('openModalBtn'); // Button to open the modal
    const closeModalBtn = document.getElementById('closeModalBtn');

    if (openModalBtn) {
      openModalBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
      });
    }

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    }
  });


//Review Interactions
document.addEventListener('DOMContentLoaded', () => {
  // Edit functionality
  const editButtons = document.querySelectorAll('.openEditBtn');
  console.log('Number of edit buttons found:', editButtons.length);

  const editModal = document.getElementById('editModal');
  const editForm = document.getElementById('editForm');
  const editTextarea = document.getElementById('editTextarea');
  const closeEditBtn = document.getElementById('closeEditBtn');
  const likeButtons = document.querySelectorAll('.likeButton'); // Assuming multiple like buttons
  console.log('Number of like buttons found:', likeButtons.length);
  
  if (likeButtons.length > 0) {
    likeButtons.forEach(likeButton => {
      likeButton.addEventListener('click', async () => {
        const reviewId = likeButton.dataset.reviewId; // Assume you have this data attribute

        try {
          const response = await fetch(`/reviews/${reviewId}/like`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            // Update UI or button state
            console.log('Marked as Helpful');
            window.location.reload();
            likeButton.disabled = true; // Disable the button after liking
          } else {
            const errorMessage = await response.text();
            alert(errorMessage);
          }
        } catch (error) {
          console.error('Error:', error);
          alert('An error occurred while marking as helpful');
        }
      });
    });
  }

  editButtons.forEach(button => {
    button.addEventListener('click', () => {
      const reviewContainer = button.closest('.review-container');
      if (reviewContainer) {
        const reviewId = reviewContainer.dataset.reviewId;
        const currentComment = reviewContainer.querySelector('.review-content p').textContent;
        
        editTextarea.value = currentComment;
        editForm.setAttribute('action', `/reviews/${reviewId}/edit`);
        editModal.classList.remove('hidden');
      } else {
        console.error('Review container not found');
      }
    });
  });

  if (closeEditBtn) {
    closeEditBtn.addEventListener('click', () => {
      editModal.classList.add('hidden');
    });
  } else {
    console.error('Close edit button not found');
  }

  // Delete functionality
  const deleteButtons = document.querySelectorAll('.deleteReviewBtn');
  
  deleteButtons.forEach(button => {
    button.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this review?')) {
        const reviewContainer = button.closest('.review-container');
        if (reviewContainer) {
          const reviewId = reviewContainer.dataset.reviewId;
          
          try {
            const response = await fetch(`/reviews/${reviewId}`, {
              method: 'DELETE',
            });
            
            if (response.ok) {
              reviewContainer.remove();
            } else {
              alert('Failed to delete review');
            }
          } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while deleting the review');
          }
        } else {
          console.error('Review container not found');
        }
      }
    });
  });
});
  


//WRITE A COMMENT
// Function to show the modal
document.querySelectorAll('[id^="openComment-"]').forEach(button => {
  button.addEventListener('click', () => {
      const reviewId = button.id.split('-')[1];
      document.getElementById(`commentModal-${reviewId}`).classList.remove('hidden');
  });
});

function closeCommentModal(reviewId) {
  document.getElementById(`commentModal-${reviewId}`).classList.add('hidden');
}

// Function to hide the modal
function hideCommentModal() {
    var modal = document.getElementById("commentModal");
    modal.classList.add("hidden");
}

//PROFILE MODAL
function showModal(action) {
  document.getElementById('futureModalTitle').textContent = action + ' - To be implemented in the future';
  document.getElementById('futureModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('futureModal').classList.add('hidden');
}
