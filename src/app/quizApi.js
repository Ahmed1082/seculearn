const QUIZ_API_BASE_URL = "/api";

const getStoredToken = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
};

const buildHeaders = ({ token, hasJsonBody = false, headers = {} } = {}) => {
  const resolvedToken = token || getStoredToken();

  return {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
    ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
    ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
    ...headers,
  };
};

const appendQueryParams = (url, params = {}) => {
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });
};

const extractErrorMessage = (payload, fallbackMessage) => {
  if (typeof payload === "string" && payload.trim()) return payload.trim();

  // Laravel-style validation errors: { message, errors: { field: [msg] } }
  if (payload && typeof payload === "object" && payload.errors) {
    const errors = payload.errors;

    // Sometimes backend wraps a single message inside errors.message
    if (typeof errors?.message === "string" && errors.message.trim()) {
      return errors.message.trim();
    }

    if (errors && typeof errors === "object") {
      for (const value of Object.values(errors)) {
        if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
          return value[0].trim();
        }
        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }
      }
    }
  }

  const candidate =
    payload?.message ||
    payload?.error ||
    payload?.errors?.message ||
    payload?.detail ||
    fallbackMessage;

  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : fallbackMessage;
};

async function requestQuizApi(path, options = {}) {
  const {
    method = "GET",
    token,
    params,
    body,
    headers,
  } = options;

  const url = new URL(
    `${QUIZ_API_BASE_URL}${path}`,
    typeof window !== "undefined" ? window.location.origin : undefined
  );
  appendQueryParams(url, params);

  const response = await fetch(url.toString(), {
    method,
    headers: buildHeaders({
      token,
      hasJsonBody: body !== undefined,
      headers,
    }),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const rawText = await response.text();
  let payload = null;

  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = rawText;
    }
  }

  if (!response.ok) {
    const error = new Error(
      extractErrorMessage(payload, `Request failed with status ${response.status}.`)
    );
    error.status = response.status;
    error.data = payload;
    throw error;
  }

  return payload;
}

export async function createQuiz(data, token) {
  return requestQuizApi("/create-quiz", {
    method: "POST",
    token,
    body: data,
  });
}

export async function getQuizzesList({ lecture_id, section_id } = {}, token) {
  return requestQuizApi("/get-quizzes-list", {
    token,
    params: { lecture_id, section_id },
  });
}

export async function getQuizForEdit(id, token) {
  return requestQuizApi(`/get-quiz-for-edit/${id}`, { token });
}

// Attempts to load a single quiz with its questions/options for editing.
// Backends differ in route naming, so we try a small set of common endpoints.
export async function getQuizById(id, token) {
  const candidates = [
    `/quiz/${id}`,
    `/quizzes/${id}`,
    `/get-quiz/${id}`,
    `/get-quiz-details/${id}`,
    `/quiz-details/${id}`,
    `/quiz/${id}/details`,
  ];

  let lastError = null;
  for (const path of candidates) {
    try {
      return await requestQuizApi(path, { token });
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to load quiz details.");
}

export async function getQuizResultsDashboard(id, token) {
  return requestQuizApi(`/quiz-results-dashboard/${id}`, { token });
}

export async function startQuiz(id, token) {
  return requestQuizApi(`/student/quiz/${id}/start`, { token });
}

export async function submitQuiz(id, answers, token) {
  return requestQuizApi(`/student/quiz/${id}/submit`, {
    method: "POST",
    token,
    body: { answers },
  });
}

export async function getStudentQuizDetails(quizId, studentId, token) {
  return requestQuizApi(`/dr-ta/quiz/${quizId}/student/${studentId}/details`, {
    token,
  });
}

export async function getMyQuizResult(id, token) {
  return requestQuizApi(`/student/quiz/${id}/my-result`, { token });
}

export async function updateQuiz(id, data, token) {
  return requestQuizApi(`/update-quiz/${id}`, {
    method: "POST",
    token,
    body: data,
  });
}

export async function deleteQuiz(id, token) {
  return requestQuizApi(`/delete-quiz/${id}`, {
    method: "DELETE",
    token,
  });
}
