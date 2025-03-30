// Admin Dashboard 
document.addEventListener('DOMContentLoaded', function() {
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});


document.addEventListener('DOMContentLoaded', function() {
  var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
  var popoverList = popoverTriggerList.map(function(popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl);
  });
});

document.addEventListener('DOMContentLoaded', function() {
  var alerts = document.querySelectorAll('.alert');
  alerts.forEach(function(alert) {
    setTimeout(function() {
      var bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    }, 5000);
  });
});


function confirmDelete(event) {
  if (!confirm('Bạn có chắc chắn muốn xóa mục này?')) {
    event.preventDefault();
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var sidebarToggle = document.querySelector('.sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function() {
      document.querySelector('.sidebar').classList.toggle('show');
    });
  }
});


function previewImage(input) {
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function(e) {
      document.querySelector('.image-preview').src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}


(function() {
  'use strict';
  
  var forms = document.querySelectorAll('.needs-validation');
  
  Array.prototype.slice.call(forms).forEach(function(form) {
    form.addEventListener('submit', function(event) {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      
      form.classList.add('was-validated');
    }, false);
  });
})();

function searchTable(input, tableId) {
  var filter = input.value.toLowerCase();
  var table = document.getElementById(tableId);
  var tr = table.getElementsByTagName('tr');
  
  for (var i = 1; i < tr.length; i++) {
    var td = tr[i].getElementsByTagName('td');
    var found = false;
    
    for (var j = 0; j < td.length; j++) {
      var cell = td[j];
      if (cell) {
        var text = cell.textContent || cell.innerText;
        if (text.toLowerCase().indexOf(filter) > -1) {
          found = true;
          break;
        }
      }
    }
    
    tr[i].style.display = found ? '' : 'none';
  }
}


function sortTable(tableId, column) {
  var table = document.getElementById(tableId);
  var tbody = table.getElementsByTagName('tbody')[0];
  var rows = Array.from(tbody.getElementsByTagName('tr'));
  
  rows.sort(function(a, b) {
    var aValue = a.getElementsByTagName('td')[column].textContent.trim();
    var bValue = b.getElementsByTagName('td')[column].textContent.trim();
    
    return aValue.localeCompare(bValue);
  });
  
  rows.forEach(function(row) {
    tbody.appendChild(row);
  });
}

function initCharts() {
  var ctx = document.getElementById('myChart').getContext('2d');
  var myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Doanh thu',
        data: [12, 19, 3, 5, 2, 3],
        borderColor: '#007bff',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('myChart')) {
    initCharts();
  }
}); 