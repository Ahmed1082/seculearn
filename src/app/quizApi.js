import { apiRequest } from "./apiClient";

const QUIZ_API_BASE_URL = "/api";

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
    timeout,
    cache,
  } = options;
  const normalizedMethod = method.toUpperCase();

  try {
    const response = await apiRequest(`${QUIZ_API_BASE_URL}${path}`, {
      method: normalizedMethod,
      token,
      params,
      data: body,
      headers: body !== undefined ? { "Content-Type": "application/json", ...headers } : headers,
      cache: cache ?? normalizedMethod === "GET",
      timeout,
    });

    return response.data;
  } catch (requestError) {
    const payload = requestError?.response?.data;
    const status = requestError?.response?.status;

    if (!status) throw requestError;

    const error = new Error(
      extractErrorMessage(payload, `Request failed with status ${status}.`)
    );
    error.status = status;
    error.data = payload;
    throw error;
  }
}

export async function createQuiz(data, token) {
  return requestQuizApi("/create-quiz", {
    method: "POST",
    token,
    body: data,
  });
}

export async function getQuizzesList({ lecture_id, section_id } = {}, token, options = {}) {
  return requestQuizApi("/get-quizzes-list", {
    token,
    params: { lecture_id, section_id },
    ...options,
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
