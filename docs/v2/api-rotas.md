# API v2 — mapa de rotas

Prefixo `/api`. 🔓 = pública · 👤 = logado · 🎓 = teacher/admin · 🛡️ = admin.
Tipos em `packages/contracts`. Respostas em snake_case.

## Auth e conta
| Método | Rota | Acesso | Corpo → Resposta |
|---|---|---|---|
| POST | /auth/sign-up | 🔓 | SignUpInput → SessionResponse |
| POST | /auth/sign-in | 🔓 | SignInInput → SessionResponse |
| POST | /auth/sign-out | 👤 | → 204 |
| GET | /auth/me | 👤 | → SessionResponse |
| POST | /auth/password/forgot | 🔓 | {email} → 202 |
| POST | /auth/password/reset | 🔓 | {token,password} → {ok} |
| POST | /auth/password/change | 👤 | {current_password,new_password} → {ok} |
| PATCH | /me/profile | 👤 | UpdateMyProfileInput → Profile |
| DELETE | /me | 👤 | {password} → 204 (LGPD: apaga conta) |
| GET | /me/export | 👤 | → JSON com todos os dados do usuário (LGPD) |

## Perfis e gamificação
| GET | /leaderboard?limit | 🔓 | → PublicProfile[] |
| GET | /users/by-username/:username | 🔓 | → PublicProfile |
| GET | /users/:id/activity | 🔓 | → ActivityDay[] (365 dias) |
| GET | /users/:id/badges | 🔓 | → UserBadge[] |
| GET | /badges | 🔓 | → Badge[] |
| POST/PATCH/DELETE | /admin/badges[/:id] | 🛡️ | BadgeInput / BadgeUpdateInput |

## Catálogo (módulos, cursos, lições)
| GET | /modules | 🔓 | → Module[] |
| GET | /modules/lesson-counts | 🔓 | → Record<moduleId, number> |
| POST/PATCH/DELETE | /modules[/:id] | 🛡️ | ModuleInput |
| GET | /courses | 🔓(opcional) | → Course[] publicados (+lesson_count, +enrolled se logado) |
| GET | /courses/:id | 🔓(opcional) | → Course (+lesson_count,+enrolled); rascunho só dono/admin |
| GET | /courses/:id/lessons | 🔓(opcional) | → Lesson[] publicadas do curso (dono/admin: todas) |
| GET | /teacher/courses | 🎓 | → Course[] do professor (admin: todos) |
| POST | /courses | 🎓 | CourseInput → Course |
| PATCH | /courses/:id | 🎓 dono | CourseUpdateInput → Course |
| DELETE | /courses/:id | 🎓 dono | → 204 |
| PATCH | /courses/:id/publish | 🎓 dono | {published} → Course |
| PUT | /courses/:id/lessons/order | 🎓 dono | {lesson_ids} → 204 |
| POST | /courses/:id/lessons | 🎓 dono | {lesson_id, order?} → 204 |
| DELETE | /courses/:id/lessons/:lessonId | 🎓 dono | → 204 |
| POST | /courses/:id/enrollment | 👤 | → 204 |
| DELETE | /courses/:id/enrollment | 👤 | → 204 |
| GET | /me/enrollments | 👤 | → string[] (ids de curso) |
| GET | /lessons/summaries | 🔓 | → LessonSummary[] publicadas |
| GET | /lessons | 🔓 | → Lesson[] publicadas |
| GET | /lessons/:id | 🔓(opcional) | → Lesson (sem gabarito); rascunho só dono/admin |
| GET | /lessons/:id/authoring | 🎓 dono | → LessonWithTests |
| GET | /teacher/lessons | 🎓 | → Lesson[] do professor (admin: todas) |
| GET | /teacher/metrics | 🎓 | → LessonMetrics[] das lições do professor |
| POST | /lessons | 🎓 | LessonInput → LessonWithTests |
| PATCH | /lessons/:id | 🎓 dono | LessonUpdateInput → LessonWithTests |
| DELETE | /lessons/:id | 🎓 dono | → 204 |
| PATCH | /lessons/:id/publish | 🎓 dono | {published} → Lesson |

## Aprendizado e correção
| GET | /me/progress | 👤 | → LessonProgress[] |
| GET | /me/progress/completed | 👤 | → string[] |
| GET/PUT | /lessons/:id/snapshot | 👤 | {files} |
| POST | /lessons/:id/submissions | 👤 | {files} → SubmissionResult |
| POST | /lessons/:id/complete | 👤 | (só teoria) → {lesson_completed,xp_awarded,...} |
| GET | /lessons/:id/quiz | 👤 | → QuizQuestionPublic[] |
| GET | /lessons/:id/quiz/authoring | 🎓 dono | → QuizQuestionFull[] |
| PUT | /lessons/:id/quiz | 🎓 dono | {questions} → QuizQuestionFull[] |
| POST | /lessons/:id/quiz/submissions | 👤 | {answers} → QuizResult |

## Prova e certificado
| GET | /courses/:id/exam | 👤 | → ExamStatus |
| POST | /courses/:id/exam/attempts | 👤 | → ExamStart |
| POST | /courses/:id/exam/submit | 👤 | ExamSubmitInput → ExamResult |
| POST | /courses/:id/certificate | 👤 | → CertificateIssue |
| GET | /courses/:id/certificate | 👤 | → MyCertificate \| null |
| GET | /me/certificates | 👤 | → MyCertificate[] |
| GET | /certificates/:code | 🔓 | → CertificateVerification |
| GET | /certificates/:code/pdf | 🔓 | → application/pdf |
| GET | /admin/exams | 🛡️ | → {id,course_id,course_title,title}[] |
| GET | /admin/exams/:examId/questions | 🛡️ | → AdminExamQuestion[] |
| POST | /admin/exams/:examId/questions | 🛡️ | ExamQuestionInput → AdminExamQuestion |
| PATCH | /admin/exam-questions/:id | 🛡️ | ExamQuestionUpdateInput → AdminExamQuestion |

## Notas, notificações, bibliotecas, solicitações de professor
| GET/POST | /me/notes | 👤 | NoteInput → Note |
| PATCH/DELETE | /me/notes/:id | 👤 dono | NoteUpdateInput |
| GET | /me/notifications?limit | 👤 | → Notification[] |
| POST | /me/notifications/:id/read | 👤 | → 204 |
| POST | /me/notifications/read-all | 👤 | → 204 |
| GET | /library | 🔓 | → LibraryCatalog[] ativos |
| POST | /library/requests | 🎓 | LibraryRequestInput → LibraryRequest |
| GET | /me/library/requests | 🎓 | → LibraryRequest[] |
| GET | /admin/library | 🛡️ | → LibraryCatalog[] |
| PATCH | /admin/library/:id | 🛡️ | {active} → 204 |
| GET | /admin/library/requests | 🛡️ | → LibraryRequest[] (+requester_name) |
| POST | /admin/library/requests/:id/review | 🛡️ | ReviewLibraryRequestInput → LibraryRequest |
| POST | /me/teacher-request | 👤 | TeacherRequestInput → TeacherApproval |
| GET | /me/teacher-request | 👤 | → TeacherApproval \| null |

## Administração
| GET | /admin/users | 🛡️ | → Profile[] |
| PATCH | /admin/users/:id | 🛡️ | AdminUpdateUserInput → Profile |
| DELETE | /admin/users/:id | 🛡️ | → 204 |
| POST | /admin/users/:id/reset-progress | 🛡️ | → 204 |
| POST | /admin/users/:id/password-reset | 🛡️ | → 202 (envia link) |
| POST | /admin/users/invite | 🛡️ | {email, full_name?} → Profile |
| GET | /admin/users/:id/export | 🛡️ | → JSON (LGPD) |
| POST | /admin/sessions/invalidate | 🛡️ | {user_id?} → 204 |
| GET | /admin/teacher-approvals?status | 🛡️ | → TeacherApproval[] |
| POST | /admin/teacher-approvals/:id/approve | 🛡️ | {note?} → 204 |
| POST | /admin/teacher-approvals/:id/reject | 🛡️ | {note?} → 204 |
| GET | /admin/metrics | 🛡️ | → PlatformMetrics |
| GET | /admin/activity/recent | 🛡️ | → RecentActivity[] |
| GET | /admin/activity/daily | 🛡️ | → number[] (30 dias) |
| GET | /admin/analytics | 🛡️ | → AnalyticsMetrics |
| GET | /admin/lessons | 🛡️ | → Lesson[] |
| GET/PUT | /admin/settings | 🛡️ | PlatformSettings |
| GET | /admin/audit?limit | 🛡️ | → AuditLog[] |

## Infra
| POST | /uploads/images | 👤 | multipart `file` → {url} |
| GET | /files/:name | 🔓 | imagem |
| GET | /health/live, /health/ready | 🔓 | |
