let originalData = [];
let filteredData = [];
let charts = {};

const sampleData = [
  {
    "시도": "경산시",
    "작물명": "딸기",
    "측정일자": "2025-01-06",
    "평균기온(℃)": 14.3,
    "평균습도(%)": 72.5,
    "CO2농도(ppm)": 781,
    "일사량(W/㎡)": 134.2,
    "생육지수": 85.6
  },
  {
    "시도": "경산시",
    "작물명": "오이",
    "측정일자": "2025-01-27",
    "평균기온(℃)": 21.8,
    "평균습도(%)": 82.7,
    "CO2농도(ppm)": 792,
    "일사량(W/㎡)": 187.3,
    "생육지수": 100
  },
  {
    "시도": "경산시",
    "작물명": "파프리카",
    "측정일자": "2025-02-17",
    "평균기온(℃)": 23.6,
    "평균습도(%)": 58.7,
    "CO2농도(ppm)": 836,
    "일사량(W/㎡)": 210.7,
    "생육지수": 90
  },
  {
    "시도": "경산시",
    "작물명": "토마토",
    "측정일자": "2025-03-10",
    "평균기온(℃)": 23.3,
    "평균습도(%)": 62.6,
    "CO2농도(ppm)": 800,
    "일사량(W/㎡)": 226.9,
    "생육지수": 96.5
  }
];

document.addEventListener("DOMContentLoaded", function () {
  const csvFile = document.getElementById("csvFile");
  const loadSampleBtn = document.getElementById("loadSampleBtn");
  const regionFilter = document.getElementById("regionFilter");
  const cropFilter = document.getElementById("cropFilter");
  const resetFilterBtn = document.getElementById("resetFilterBtn");

  if (csvFile) csvFile.addEventListener("change", handleCsvUpload);

  if (loadSampleBtn) {
    loadSampleBtn.addEventListener("click", function () {
      originalData = normalizeRows(sampleData);
      filteredData = [...originalData];
      initializeDashboard();
    });
  }

  if (regionFilter) regionFilter.addEventListener("change", applyFilters);
  if (cropFilter) cropFilter.addEventListener("change", applyFilters);
  if (resetFilterBtn) resetFilterBtn.addEventListener("click", resetFilters);

  originalData = normalizeRows(sampleData);
  filteredData = [...originalData];
  initializeDashboard();
});

function handleCsvUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    complete: function (results) {
      originalData = normalizeRows(results.data);
      filteredData = [...originalData];
      initializeDashboard();
    },
    error: function (error) {
      alert("CSV 파일을 읽는 중 오류가 발생했습니다: " + error.message);
    }
  });
}

function normalizeRows(rows) {
  return rows.map(function (row) {
    const normalized = {};
    Object.keys(row).forEach(function (key) {
      const cleanKey = String(key).trim();
      const rawValue = row[key];

      if (rawValue === null || rawValue === undefined) {
        normalized[cleanKey] = "";
        return;
      }

      const cleanValue = String(rawValue).trim().replace(/,/g, "");
      const numberValue = Number(cleanValue);

      if (cleanValue !== "" && !isNaN(numberValue)) {
        normalized[cleanKey] = numberValue;
      } else {
        normalized[cleanKey] = String(rawValue).trim();
      }
    });
    return normalized;
  });
}

function initializeDashboard() {
  populateFilters();
  updateDashboard();
}

function populateFilters() {
  const regionFilter = document.getElementById("regionFilter");
  const cropFilter = document.getElementById("cropFilter");

  const currentRegion = regionFilter.value || "전체";
  const currentCrop = cropFilter.value || "전체";

  const regions = uniqueValues(originalData, "시도");
  const crops = uniqueValues(originalData, "작물명");

  regionFilter.innerHTML = '<option value="전체">전체</option>';
  cropFilter.innerHTML = '<option value="전체">전체</option>';

  regions.forEach(function (value) {
    regionFilter.innerHTML += `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
  });

  crops.forEach(function (value) {
    cropFilter.innerHTML += `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
  });

  regionFilter.value = regions.includes(currentRegion) ? currentRegion : "전체";
  cropFilter.value = crops.includes(currentCrop) ? currentCrop : "전체";
}

function applyFilters() {
  const selectedRegion = document.getElementById("regionFilter").value;
  const selectedCrop = document.getElementById("cropFilter").value;

  filteredData = originalData.filter(function (row) {
    const regionMatch = selectedRegion === "전체" || row["시도"] === selectedRegion;
    const cropMatch = selectedCrop === "전체" || row["작물명"] === selectedCrop;
    return regionMatch && cropMatch;
  });

  updateDashboard();
}

function resetFilters() {
  document.getElementById("regionFilter").value = "전체";
  document.getElementById("cropFilter").value = "전체";
  filteredData = [...originalData];
  updateDashboard();
}

function updateDashboard() {
  updateSummaryCards();
  renderNumericStats();
  renderCategoryFrequency();
  renderPreviewTable();
  renderCharts();
}

function updateSummaryCards() {
  document.getElementById("rowCount").textContent = filteredData.length;
  document.getElementById("regionCount").textContent = uniqueValues(filteredData, "시도").length;
  document.getElementById("cropCount").textContent = uniqueValues(filteredData, "작물명").length;

  const growthValues = getNumericValues(filteredData, "생육지수");
  document.getElementById("avgGrowth").textContent = growthValues.length ? average(growthValues).toFixed(1) : "-";
}

function renderNumericStats() {
  const tbody = document.querySelector("#numericStatsTable tbody");
  tbody.innerHTML = "";

  const numericColumns = getNumericColumns(filteredData);

  numericColumns.forEach(function (column) {
    const values = getNumericValues(filteredData, column);
    if (!values.length) return;

    tbody.innerHTML += `
      <tr>
        <td>${escapeHtml(column)}</td>
        <td>${values.length}</td>
        <td>${formatNumber(average(values))}</td>
        <td>${formatNumber(Math.min(...values))}</td>
        <td>${formatNumber(median(values))}</td>
        <td>${formatNumber(Math.max(...values))}</td>
        <td>${formatNumber(standardDeviation(values))}</td>
      </tr>
    `;
  });

  if (!numericColumns.length) {
    tbody.innerHTML = '<tr><td colspan="7">수치형 컬럼이 없습니다.</td></tr>';
  }
}

function renderCategoryFrequency() {
  const container = document.getElementById("categoryFrequency");
  container.innerHTML = "";

  const categoryColumns = getCategoryColumns(filteredData);

  categoryColumns.forEach(function (column) {
    const counts = frequencyCount(filteredData, column);
    const items = Object.entries(counts)
      .sort(function (a, b) { return b[1] - a[1]; })
      .map(function ([name, count]) {
        return `
          <div class="frequency-item">
            <span>${escapeHtml(name)}</span>
            <strong>${count}건</strong>
          </div>
        `;
      })
      .join("");

    container.innerHTML += `
      <div class="frequency-block">
        <h3>${escapeHtml(column)}</h3>
        ${items || "<p>데이터 없음</p>"}
      </div>
    `;
  });

  if (!categoryColumns.length) {
    container.innerHTML = "<p>목록형 컬럼이 없습니다.</p>";
  }
}

function renderPreviewTable() {
  const table = document.getElementById("previewTable");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  thead.innerHTML = "";
  tbody.innerHTML = "";

  if (!filteredData.length) {
    tbody.innerHTML = '<tr><td>표시할 데이터가 없습니다.</td></tr>';
    return;
  }

  const columns = Object.keys(filteredData[0]);

  thead.innerHTML = `
    <tr>
      ${columns.map(function (column) { return `<th>${escapeHtml(column)}</th>`; }).join("")}
    </tr>
  `;

  filteredData.slice(0, 50).forEach(function (row) {
    tbody.innerHTML += `
      <tr>
        ${columns.map(function (column) { return `<td>${escapeHtml(row[column])}</td>`; }).join("")}
      </tr>
    `;
  });
}

function renderCharts() {
  destroyCharts();
  renderGrowthByCropChart();
  renderGrowthTrendChart();
  renderTempGrowthScatterChart();
  renderEnvironmentByCropChart();
}

function renderGrowthByCropChart() {
  const grouped = groupAverage(filteredData, "작물명", "생육지수");

  charts.growthByCrop = new Chart(document.getElementById("growthByCropChart"), {
    type: "bar",
    data: {
      labels: grouped.labels,
      datasets: [{
        label: "평균 생육지수",
        data: grouped.values,
        borderWidth: 1,
        borderRadius: 8
      }]
    },
    options: defaultChartOptions("생육지수")
  });
}

function renderGrowthTrendChart() {
  const grouped = groupAverage(filteredData, "측정일자", "생육지수");
  const sorted = grouped.labels
    .map(function (label, index) {
      return { label: label, value: grouped.values[index] };
    })
    .sort(function (a, b) {
      return new Date(a.label) - new Date(b.label);
    });

  charts.growthTrend = new Chart(document.getElementById("growthTrendChart"), {
    type: "line",
    data: {
      labels: sorted.map(function (item) { return item.label; }),
      datasets: [{
        label: "평균 생육지수",
        data: sorted.map(function (item) { return item.value; }),
        tension: 0.35,
        pointRadius: 4,
        borderWidth: 2
      }]
    },
    options: defaultChartOptions("생육지수")
  });
}

function renderTempGrowthScatterChart() {
  const points = filteredData
    .filter(function (row) {
      return isNumber(row["평균기온(℃)"]) && isNumber(row["생육지수"]);
    })
    .map(function (row) {
      return {
        x: row["평균기온(℃)"],
        y: row["생육지수"]
      };
    });

  charts.tempGrowthScatter = new Chart(document.getElementById("tempGrowthScatterChart"), {
    type: "scatter",
    data: {
      datasets: [{
        label: "평균기온 대비 생육지수",
        data: points,
        pointRadius: 5
      }]
    },
    options: scatterChartOptions()
  });
}

function renderEnvironmentByCropChart() {
  const crops = uniqueValues(filteredData, "작물명");
  const columns = ["평균기온(℃)", "평균습도(%)", "CO2농도(ppm)", "일사량(W/㎡)"];

  const datasets = columns.map(function (column) {
    return {
      label: column,
      data: crops.map(function (crop) {
        const rows = filteredData.filter(function (row) {
          return row["작물명"] === crop;
        });
        return Number(average(getNumericValues(rows, column)).toFixed(2));
      }),
      borderWidth: 1,
      borderRadius: 8
    };
  });

  charts.environmentByCrop = new Chart(document.getElementById("environmentByCropChart"), {
    type: "bar",
    data: {
      labels: crops,
      datasets: datasets
    },
    options: defaultChartOptions("평균값")
  });
}

function destroyCharts() {
  Object.values(charts).forEach(function (chart) {
    chart.destroy();
  });
  charts = {};
}

function defaultChartOptions(yTitle) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 700
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          padding: 14
        }
      },
      tooltip: {
        backgroundColor: "rgba(20, 30, 45, 0.92)",
        padding: 10,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 0
        }
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: yTitle
        },
        grid: {
          color: "rgba(120, 135, 160, 0.16)"
        }
      }
    }
  };
}

function scatterChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 700
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          padding: 14
        }
      },
      tooltip: {
        backgroundColor: "rgba(20, 30, 45, 0.92)",
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: function (context) {
            return `기온 ${context.raw.x}, 생육지수 ${context.raw.y}`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "평균기온(℃)"
        },
        grid: {
          color: "rgba(120, 135, 160, 0.16)"
        }
      },
      y: {
        title: {
          display: true,
          text: "생육지수"
        },
        grid: {
          color: "rgba(120, 135, 160, 0.16)"
        }
      }
    }
  };
}

function getNumericColumns(data) {
  if (!data.length) return [];

  return Object.keys(data[0]).filter(function (column) {
    const values = data
      .map(function (row) { return row[column]; })
      .filter(function (value) {
        return value !== "" && value !== null && value !== undefined;
      });

    return values.length > 0 && values.every(function (value) {
      return isNumber(value);
    });
  });
}

function getCategoryColumns(data) {
  if (!data.length) return [];
  const numericColumns = getNumericColumns(data);

  return Object.keys(data[0]).filter(function (column) {
    return !numericColumns.includes(column);
  });
}

function getNumericValues(data, column) {
  return data
    .map(function (row) { return row[column]; })
    .filter(function (value) { return isNumber(value); })
    .map(Number);
}

function uniqueValues(data, column) {
  return [...new Set(data
    .map(function (row) { return row[column]; })
    .filter(function (value) {
      return value !== "" && value !== undefined && value !== null;
    }))];
}

function frequencyCount(data, column) {
  return data.reduce(function (acc, row) {
    const key = row[column] || "미입력";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function groupAverage(data, groupColumn, valueColumn) {
  const groups = {};

  data.forEach(function (row) {
    const group = row[groupColumn] || "미입력";
    const value = row[valueColumn];

    if (!isNumber(value)) return;

    if (!groups[group]) groups[group] = [];
    groups[group].push(Number(value));
  });

  const labels = Object.keys(groups);
  const values = labels.map(function (label) {
    return Number(average(groups[label]).toFixed(2));
  });

  return { labels: labels, values: values };
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce(function (sum, value) {
    return sum + Number(value);
  }, 0) / values.length;
}

function median(values) {
  if (!values.length) return 0;

  const sorted = [...values].sort(function (a, b) { return a - b; });
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function standardDeviation(values) {
  if (values.length <= 1) return 0;

  const avg = average(values);
  const variance = average(values.map(function (value) {
    return Math.pow(value - avg, 2);
  }));

  return Math.sqrt(variance);
}

function isNumber(value) {
  return typeof value === "number" && !isNaN(value);
}

function formatNumber(value) {
  if (value === undefined || value === null || isNaN(value)) return "-";

  return Number(value).toLocaleString("ko-KR", {
    maximumFractionDigits: 2
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
