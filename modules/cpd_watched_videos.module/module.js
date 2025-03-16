

document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const gridView = document.getElementById('videosGridView');
  const listView = document.getElementById('videosListView');
  const gridViewBtn = document.getElementById('gridViewBtn');
  const listViewBtn = document.getElementById('listViewBtn');
  const filterSelect = document.getElementById('filterSelect');
  const sortSelect = document.getElementById('sortSelect');
  const searchInput = document.getElementById('searchInput');
  const videoCount = document.getElementById('videoCount');
  const noResults = document.getElementById('noResults');
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  
  // State variables
  let videosData = [];
  let isLoading = true;
  
  // Function to format the time difference from now
  function getTimeDifference(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);
    
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    
    return date.toLocaleDateString();
  }
  
  // Function to render star rating
  function renderStars(rating) {
    let starsHtml = '';
    const ratingNum = parseInt(rating) || 0;
    for (let i = 0; i < 5; i++) {
      if (i < ratingNum) {
        starsHtml += '<svg fill="#ffd700" width="20px" height="20px" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>star</title> <path d="M3.488 13.184l6.272 6.112-1.472 8.608 7.712-4.064 7.712 4.064-1.472-8.608 6.272-6.112-8.64-1.248-3.872-7.808-3.872 7.808z"></path> </g></svg>';
      } else {
        starsHtml += '<svg fill="#ffd700" width="20px" height="20px" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>star</title> <path d="M3.488 13.184l6.272 6.112-1.472 8.608 7.712-4.064 7.712 4.064-1.472-8.608 6.272-6.112-8.64-1.248-3.872-7.808-3.872 7.808z"></path> </g></svg>';
      }
    }
    return starsHtml;
  }
  
  // Function to filter videos by time period
  function filterVideosByTime(videos, filter) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = new Date(today - 6 * 24 * 60 * 60 * 1000).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    return videos.filter(video => {
      const videoDate = new Date(video.hs_createdate).getTime();
      
      switch (filter) {
        case 'today':
          return videoDate >= today;
        case 'thisWeek':
          return videoDate >= weekStart;
        case 'thisMonth':
          return videoDate >= monthStart;
        default:
          return true;
      }
    });
  }
  
  // Function to sort videos
  function sortVideos(videos, sortBy) {
    return [...videos].sort((a, b) => {
      const dateA = new Date(a.hs_createdate).getTime();
      const dateB = new Date(b.hs_createdate).getTime();
      
      return sortBy === 'recent' ? dateB - dateA : dateA - dateB;
    });
  }
  
  // Function to filter videos by search term
  function filterVideosBySearch(videos, searchTerm) {
    if (!searchTerm) return videos;
    
    const term = searchTerm.toLowerCase();
    return videos.filter(video => 
      video.record_name.toLowerCase().includes(term) || 
      (video.feedback && video.feedback.toLowerCase().includes(term)) ||
      (video.comment && video.comment.toLowerCase().includes(term))
    );
  }
  
  // Function to render videos
  function renderVideos() {
    // Reset UI states
    gridView.classList.add('hidden');
    listView.classList.add('hidden');
    noResults.classList.add('hidden');
    error.classList.add('hidden');
    
    if (isLoading) {
      loading.classList.remove('hidden');
      return;
    } else {
      loading.classList.add('hidden');
    }
    
    // Get filter, sort, and search values
    const filterValue = filterSelect.value;
    const sortValue = sortSelect.value;
    const searchValue = searchInput.value.trim();
    
    // Apply filters and sort
    let filteredVideos = filterVideosByTime(videosData, filterValue);
    filteredVideos = filterVideosBySearch(filteredVideos, searchValue);
    filteredVideos = sortVideos(filteredVideos, sortValue);
    
    // Update video count
    videoCount.textContent = `Showing ${filteredVideos.length} of ${videosData.length} videos`;
    
    // Show/hide no results message
    if (filteredVideos.length === 0) {
      noResults.classList.remove('hidden');
      return;
    } else {
      if (gridViewBtn.classList.contains('active')) {
        gridView.classList.remove('hidden');
      } else {
        listView.classList.remove('hidden');
      }
    }
    
    // Clear views
    gridView.innerHTML = '';
    listView.innerHTML = '';
    
    // Render videos in both views
    filteredVideos.forEach(video => {
      const timeDiff = getTimeDifference(video.hs_createdate);
      const stars = renderStars(video.rating);
      const recordName = video.record_name || 'Untitled Video';
      const feedback = video.feedback || 'No feedback provided';
      const comment = video.comment || 'No comments';
      
      // Create grid view card
      const gridCard = document.createElement('div');
      gridCard.className = 'video-card';
      gridCard.innerHTML = `
        <div class="video-thumbnail">
          <iframe src="https://player.vimeo.com/video/${video.videoIdFound}?title=0&byline=0&portrait=0" 
                  allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
        </div>
        <div class="video-info">
          <h3 class="video-title">${recordName}</h3>
          <div class="video-meta">
            <div class="video-time">
               <span class="clock"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock h-3 w-3 mr-1"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span>
               <span> Watched ${timeDiff}</span></div>
            <div class="rating-stars">${stars}</div>
          </div>
          <p class="video-feedback">${feedback}</p>
        </div>
      `;
      gridView.appendChild(gridCard);
      
      // Create list view item
      const listItem = document.createElement('div');
      listItem.className = 'list-item';
      listItem.innerHTML = `
        <div class="list-item-content">
          <div class="list-item-thumbnail">
            <iframe src="https://player.vimeo.com/video/${video.videoIdFound}?title=0&byline=0&portrait=0" 
                    allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
          </div>
          <div class="list-item-info">
            <div class="list-item-header">
              <h3 class="list-item-title">${recordName}</h3>
              <div class="rating-stars">${stars}</div>
            </div>
            <div class="video-time">
               <span class="clock"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock h-3 w-3 mr-1"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span>
               <span> Watched ${timeDiff}</span></div>
            <p class="list-item-feedback">${feedback}</p>
            <p class="list-item-comment">${comment}</p>
          </div>
        </div>
      `;
      listView.appendChild(listItem);
    });
  }
  
  // Event listeners for view toggle
  gridViewBtn.addEventListener('click', function() {
    gridViewBtn.classList.add('active');
    listViewBtn.classList.remove('active');
    
    gridView.classList.remove('hidden');
    listView.classList.add('hidden');
  });
  
  listViewBtn.addEventListener('click', function() {
    listViewBtn.classList.add('active');
    gridViewBtn.classList.remove('active');
    
    listView.classList.remove('hidden');
    gridView.classList.add('hidden');
  });
  
  // Event listeners for filter/sort/search
  filterSelect.addEventListener('change', renderVideos);
  sortSelect.addEventListener('change', renderVideos);
  searchInput.addEventListener('input', renderVideos);
  
  // Function to fetch data from API
  async function fetchVideoData() {
    isLoading = true;
    renderVideos(); // Show loading state
    
    try {
      // Get the contactId from URL parameters or use a default
    //   const urlParams = new URLSearchParams(window.location.search);
    //   const contactId = urlParams.get('contactId') || '6193951';
    const contactId = document.querySelector(".cpd_watched_videos")?.getAttribute("data-contactid");
      
      const response = await fetch(`https://community.drawingandtalking.com/_hcms/api/get-cpd-record-details?contactId=${contactId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      
      const result = await response.json();
      console.log(result)
      if (!result.success || !result.data || !result.data.length) {
        throw new Error("No videos found or API error");
      }
      
      videosData = result.data;
      isLoading = false;
      renderVideos();
      
    } catch (err) {
      console.error("Error fetching video data:", err);
      isLoading = false;
      loading.classList.add('hidden');
      error.classList.remove('hidden');
    }
  }
  
  // Initial data fetch
  fetchVideoData();
});
