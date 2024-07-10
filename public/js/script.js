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

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('editModal');
  const openEditBtn = document.getElementById('openEditBtn'); // Button to open the modal
  const closeEditBtn = document.getElementById('closeEditBtn');
  const submitEdit = document.getElementById('submitEdit');

  if (openEditBtn) {
    openEditBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
    });
  }

  if (closeEditBtn) {
    closeEditBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  if (submitEdit) {
    submitEdit.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }
});

//WRITE A COMMENT
// Function to show the modal
function showCommentModal() {
    var modal = document.getElementById("commentModal");
    modal.classList.remove("hidden");
}

// Function to hide the modal
function hideCommentModal() {
    var modal = document.getElementById("commentModal");
    modal.classList.add("hidden");
}

// Event listener for opening the modal
document.getElementById('openComment').addEventListener('click', showCommentModal);

// Event listener for closing the modal when the submit button is clicked
document.getElementById('submitComment').addEventListener('click', hideCommentModal);

// Event listener for closing the modal when the close button is clicked
document.getElementById('closeCommentModal').addEventListener('click', hideCommentModal);


document.addEventListener('DOMContentLoaded', () => {
  const starRatingContainer = document.getElementById('starRating');
  const rating = parseFloat(starRatingContainer.getAttribute('data-rating'));

  const fullStars = Math.floor(rating);
  const decimalPart = rating % 1;
  const halfStar = decimalPart >= 0.25 && decimalPart < 0.75;
  const halfAltStar = decimalPart >= 0.75;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0) - (halfAltStar ? 1 : 0);

  let starHTML = '';
  
  for (let i = 0; i < fullStars; i++) {
      starHTML += '<span class="fa fa-star"></span>';
  }
  if (halfStar) {
      starHTML += '<span class="fa fa-star-half-alt"></span>';
  }
  if (halfAltStar) {
      starHTML += '<span class="fa fa-star"></span>';
  }
  for (let i = 0; i < emptyStars; i++) {
      starHTML += '<span class="fa fa-star-o"></span>';
  }

  starRatingContainer.innerHTML = starHTML;
});


//DELETE MODAL
document.addEventListener('DOMContentLoaded', () => {
  const deleteButtons = document.querySelectorAll('#deleteReviewBtn');

  deleteButtons.forEach(button => {
      button.addEventListener('click', async (event) => {
          const reviewId = button.getAttribute('data-review-id');
          if (confirm('Are you sure you want to delete this review?')) {
              try {
                  const response = await fetch(`/reviews/${reviewId}`, {
                      method: 'DELETE',
                      headers: {
                          'Content-Type': 'application/json'
                      }
                  });
                  if (response.ok) {
                      window.location.reload();
                  } else {
                      console.error('Failed to delete review.');
                  }
              } catch (error) {
                  console.error('Error deleting review:', error);
              }
          }
      });
  });
});


//PROFILE MODAL
function showModal(action) {
  document.getElementById('futureModalTitle').textContent = action + ' - To be implemented in the future';
  document.getElementById('futureModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('futureModal').classList.add('hidden');
}
