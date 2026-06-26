import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const TARGET_HOST = 'cary-nontumorous-unimpedingly.ngrok-free.dev';

function forwardToBackend(req, res, targetPath, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = { ...req.headers };
    delete headers['host'];
    delete headers['accept-encoding'];
    headers['host'] = TARGET_HOST;
    headers['ngrok-skip-browser-warning'] = 'true';

    const reqOptions = {
      hostname: TARGET_HOST,
      path: targetPath,
      method: req.method,
      headers: headers,
    };

    if (options.method) reqOptions.method = options.method;

    const proxyReq = https.request(reqOptions, (proxyRes) => {
      let bodyChunks = [];
      proxyRes.on('data', (chunk) => {
        bodyChunks.push(chunk);
      });
      proxyRes.on('end', () => {
        const bodyBuffer = Buffer.concat(bodyChunks);
        resolve({
          statusCode: proxyRes.statusCode,
          headers: proxyRes.headers,
          body: bodyBuffer
        });
      });
    });

    proxyReq.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      proxyReq.write(options.body);
      proxyReq.end();
    } else {
      req.pipe(proxyReq);
    }
  });
}

async function handleCtfProxy(req, res) {

  // 6. GET /api/dr-ta/dashboard
  if (req.url.startsWith('/api/dr-ta/dashboard') && req.method === 'GET') {
    try {
      const dbResult = await forwardToBackend(req, res, req.url);
      if (dbResult.statusCode !== 200) {
        res.writeHead(dbResult.statusCode, dbResult.headers);
        res.end(dbResult.body);
        return;
      }
      
      let dashboardData;
      try {
        dashboardData = JSON.parse(dbResult.body.toString('utf8'));
      } catch (e) {
        console.error("Failed to parse dashboard data response:", e);
        res.writeHead(200, dbResult.headers);
        res.end(dbResult.body);
        return;
      }
      
      const coursesResult = await forwardToBackend(req, res, '/api/get-courses');
      if (coursesResult.statusCode === 200) {
        let coursesData;
        try {
          coursesData = JSON.parse(coursesResult.body.toString('utf8'));
        } catch (e) {
          console.error("Failed to parse courses response:", e);
          coursesData = {};
        }
        
        const role = coursesData.role || 'lecturer';
        const courses = coursesData.courses || [];
        
        const fetchPromises = [];
        for (const course of courses) {
          if (role === 'lecturer' && course.lectures) {
            for (const lecture of course.lectures) {
              // Fetch assignments
              fetchPromises.push(
                forwardToBackend(req, res, `/api/get-lecture-assignments/${lecture.id}`, { method: 'GET' })
                  .then(r => {
                    if (r.statusCode === 200) {
                      try {
                        const body = JSON.parse(r.body.toString('utf8'));
                        const assignments = Array.isArray(body) ? body : (Array.isArray(body.data) ? body.data : []);
                        return { type: 'assignment', courseId: course.id, assignments };
                      } catch (err) {
                        console.error(`Failed to parse lecture ${lecture.id} assignments:`, err);
                      }
                    }
                    return { type: 'assignment', courseId: course.id, assignments: [] };
                  })
                  .catch(() => ({ type: 'assignment', courseId: course.id, assignments: [] }))
              );
              // Fetch quizzes
              fetchPromises.push(
                forwardToBackend(req, res, `/api/get-quizzes-list?lecture_id=${lecture.id}`, { method: 'GET' })
                  .then(r => {
                    if (r.statusCode === 200) {
                      try {
                        const body = JSON.parse(r.body.toString('utf8'));
                        const quizzes = (Array.isArray(body?.quizzes) && body.quizzes) ||
                                        (Array.isArray(body?.data) && body.data) ||
                                        (Array.isArray(body?.quizzes_list) && body.quizzes_list) ||
                                        (Array.isArray(body?.quizzesList) && body.quizzesList) ||
                                        (Array.isArray(body) ? body : []);
                        return { type: 'quizList', courseId: course.id, quizzes };
                      } catch (err) {
                        console.error(`Failed to parse lecture ${lecture.id} quizzes:`, err);
                      }
                    }
                    return { type: 'quizList', courseId: course.id, quizzes: [] };
                  })
                  .catch(() => ({ type: 'quizList', courseId: course.id, quizzes: [] }))
              );
            }
          } else if (role === 'ta' && course.sections) {
            for (const section of course.sections) {
              // Fetch assignments
              fetchPromises.push(
                forwardToBackend(req, res, `/api/get-section-assignments/${section.id}`, { method: 'GET' })
                  .then(r => {
                    if (r.statusCode === 200) {
                      try {
                        const body = JSON.parse(r.body.toString('utf8'));
                        const assignments = Array.isArray(body) ? body : (Array.isArray(body.data) ? body.data : []);
                        return { type: 'assignment', courseId: course.id, assignments };
                      } catch (err) {
                        console.error(`Failed to parse section ${section.id} assignments:`, err);
                      }
                    }
                    return { type: 'assignment', courseId: course.id, assignments: [] };
                  })
                  .catch(() => ({ type: 'assignment', courseId: course.id, assignments: [] }))
              );
              // Fetch quizzes
              fetchPromises.push(
                forwardToBackend(req, res, `/api/get-quizzes-list?section_id=${section.id}`, { method: 'GET' })
                  .then(r => {
                    if (r.statusCode === 200) {
                      try {
                        const body = JSON.parse(r.body.toString('utf8'));
                        const quizzes = (Array.isArray(body?.quizzes) && body.quizzes) ||
                                        (Array.isArray(body?.data) && body.data) ||
                                        (Array.isArray(body?.quizzes_list) && body.quizzes_list) ||
                                        (Array.isArray(body?.quizzesList) && body.quizzesList) ||
                                        (Array.isArray(body) ? body : []);
                        return { type: 'quizList', courseId: course.id, quizzes };
                      } catch (err) {
                        console.error(`Failed to parse section ${section.id} quizzes:`, err);
                      }
                    }
                    return { type: 'quizList', courseId: course.id, quizzes: [] };
                  })
                  .catch(() => ({ type: 'quizList', courseId: course.id, quizzes: [] }))
              );
            }
          }
        }
        
        const fetchResults = await Promise.all(fetchPromises);
        
        const courseAssignments = {};
        const courseQuizzes = {};
        const allCollectedQuizzes = [];
        
        for (const r of fetchResults) {
          if (r.type === 'assignment') {
            if (!courseAssignments[r.courseId]) {
              courseAssignments[r.courseId] = [];
            }
            courseAssignments[r.courseId].push(...r.assignments);
          } else if (r.type === 'quizList') {
            if (!courseQuizzes[r.courseId]) {
              courseQuizzes[r.courseId] = [];
            }
            courseQuizzes[r.courseId].push(...r.quizzes);
            for (const q of r.quizzes) {
              if (q && q.id) {
                allCollectedQuizzes.push({ id: q.id, courseId: r.courseId });
              }
            }
          }
        }
        
        // Fetch detailed statistics for each quiz
        const quizDashboardPromises = [];
        for (const quiz of allCollectedQuizzes) {
          quizDashboardPromises.push(
            forwardToBackend(req, res, `/api/quiz-results-dashboard/${quiz.id}`, { method: 'GET' })
              .then(r => {
                if (r.statusCode === 200) {
                  try {
                    const body = JSON.parse(r.body.toString('utf8'));
                    const data = body.data || body;
                    return { quizId: quiz.id, courseId: quiz.courseId, data };
                  } catch (err) {
                    console.error(`Failed to parse quiz dashboard ${quiz.id}:`, err);
                  }
                }
                return { quizId: quiz.id, courseId: quiz.courseId, data: null };
              })
              .catch(() => ({ quizId: quiz.id, courseId: quiz.courseId, data: null }))
          );
        }
        
        const quizDashboardResults = await Promise.all(quizDashboardPromises);
        
        function parseScorePercent(score) {
          if (score === null || score === undefined) return null;
          const s = String(score).trim();
          const parsed = parseFloat(s.replace('%', ''));
          return isNaN(parsed) ? null : parsed;
        }
        
        let totalSubmitted = 0;
        let totalMissed = 0;
        let totalAssignmentsCount = 0;
        
        let totalQuizAttempts = 0;
        let sumQuizScores = 0;
        let quizScoresCount = 0;
        
        for (const r of quizDashboardResults) {
          if (!r.data) continue;
          const stats = r.data.stats || r.data.statistics || r.data;
          const completed = stats.completed ?? r.data.completed ?? r.data.done ?? 0;
          const average = stats.average ?? r.data.average ?? r.data.avg_score ?? null;
          
          totalQuizAttempts += completed;
          const parsedScore = parseScorePercent(average);
          if (parsedScore !== null) {
            sumQuizScores += parsedScore;
            quizScoresCount++;
          }
        }
        
        const getStudentCounts = (assignment) => {
          const done = assignment.done_students || assignment.completed_students || assignment.doneStudentIds || [];
          const missed = assignment.missed_students || assignment.missedStudentIds || [];
          return {
            doneCount: Array.isArray(done) ? done.length : 0,
            missedCount: Array.isArray(missed) ? missed.length : 0
          };
        };
        
        const courseSectionCounts = {};
        let totalSectionsCount = 0;
        for (const course of courses) {
          const sCount = course.sections?.length || 0;
          courseSectionCounts[course.id] = sCount;
          totalSectionsCount += sCount;
        }

        
        if (dashboardData.course_performance && Array.isArray(dashboardData.course_performance)) {
          for (const course of dashboardData.course_performance) {
            const assignments = courseAssignments[course.id] || [];
            const quizzes = courseQuizzes[course.id] || [];
            const count = assignments.length;
            const quizCount = quizzes.length;
            
            if (course.stats_line) {
              let updatedLine = course.stats_line.replace(/\d+\s+Assignments/i, `${count} Assignments`);
              updatedLine = updatedLine.replace(/\d+\s+Quizz?es/i, `${quizCount} Quizzes`);
              if (role === 'ta') {
                const sectCount = courseSectionCounts[course.id] || 0;
                updatedLine = updatedLine.replace(/\d+\s+Lectures/i, `${sectCount} Sections`);
              }
              course.stats_line = updatedLine;
            }
            
            totalAssignmentsCount += count;
            for (const assignment of assignments) {
              const { doneCount, missedCount } = getStudentCounts(assignment);
              totalSubmitted += doneCount;
              totalMissed += missedCount;
            }
          }
        }
        
        if (dashboardData.progress_bars) {
          const progress = dashboardData.progress_bars;
          const totalSubmissions = totalSubmitted + totalMissed;
          const rate = totalSubmissions > 0 ? Math.round((totalSubmitted / totalSubmissions) * 100) : 0;
          
          progress.overall_submission_rate = `${rate}%`;
          progress.submission_subtext = `${totalSubmitted} submitted - ${totalMissed} missed out of ${totalAssignmentsCount} assignments`;
          
          const overallAvgQuizScore = quizScoresCount > 0 ? Math.round(sumQuizScores / quizScoresCount) : 0;
          progress.average_quiz_score = `${overallAvgQuizScore}%`;
          progress.quiz_subtext = `Across ${allCollectedQuizzes.length} quizzes - ${totalQuizAttempts} total attempts`;
        }
        
        dashboardData.role = role;
        
        if (dashboardData.cards) {
          const overallAvgQuizScore = quizScoresCount > 0 ? Math.round(sumQuizScores / quizScoresCount) : 0;
          dashboardData.cards.avg_quiz_score = `${overallAvgQuizScore}%`;
          if (role === 'ta') {
            dashboardData.cards.total_sections = totalSectionsCount;
            dashboardData.cards.total_lectures = totalSectionsCount;
          }
        }
      }
      
      const modifiedBody = JSON.stringify(dashboardData);
      const headers = { ...dbResult.headers };
      delete headers['transfer-encoding'];
      headers['content-length'] = Buffer.byteLength(modifiedBody);
      res.writeHead(dbResult.statusCode, headers);
      res.end(modifiedBody);
    } catch (err) {
      console.error("Dashboard Interception Error:", err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'debug-logger',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const isTargetUrl = req.url.startsWith('/api/dr-ta/dashboard');

          if (!isTargetUrl) {
            return next();
          }

          handleCtfProxy(req, res).catch((err) => {
            console.error("Vite CTF Middleware Error:", err);
            if (!res.writableEnded) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Local CTF middleware error', details: err.message }));
            }
          });
        });

        server.middlewares.use('/debug-log', (req, res) => {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            fs.writeFileSync(
              path.join(__dirname, 'debug_output.json'),
              body
            );
            res.end('ok');
          });
        });
      }
    }
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://cary-nontumorous-unimpedingly.ngrok-free.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
    },
  },
})
