# DemoQA Book Store API — Contract Analysis and Observed Behavior

- Contract source: Swagger 2.0 "Book Store API v1", embedded in https://demoqa.com/swagger-ui-init.js (the `/swagger/v1/swagger.json` URL returns the site's HTML page, not the spec).
- Observed: 2026-10-02 with one disposable account (`dqa_probe_*`), deleted afterwards (DELETE 204, then GET → 401 "User not found!").
- Status: **the Swagger document is the published contract; the observed responses differ from it in several places (D1–D8).** Postman assertions check the *observed* behavior. Dedicated contract-conformance cases (API-CT-*) check the *documented* behavior where they differ, so discrepancies stay visible as failures instead of being hidden.

## Documented operations used
| Method | Path | Documented responses |
|---|---|---|
| POST | /Account/v1/User | 201 CreateUserResult {userId, username, books[]}, 404, 406 MessageModal |
| POST | /Account/v1/GenerateToken | 200 TokenViewModel {token, expires, status, result}, 400 |
| POST | /Account/v1/Authorized | 200 boolean, 400, 404 |
| GET | /Account/v1/User/{UUID} | 200 GetUserResult {userId, username, books[]}, 401 |
| DELETE | /Account/v1/User/{UUID} | 200 MessageModal, 204 BooksResult, 401 |
| GET | /BookStore/v1/Books | 200 AllBooksModal {books[BookModal]} |
| POST | /BookStore/v1/Books | 201 CollectionOfIsbn {isbn}, 400, 401 |
| DELETE | /BookStore/v1/Book | 204 UserBooksResult, 400, 401 |

MessageModal = {code: number, message: string}. Security definitions: Basic and Bearer (`Authorization: Bearer <JWT>`), applied globally; no operation declares its own security.

## Observed behavior
| ID | Observation |
|----|-------------|
| OBS-API-01 | Create User → 201 `{"userID": "<uuid>", "username": "<name>", "books": []}`. |
| OBS-API-02 | Weak password → 400 `{"code":"1300","message":"Passwords must have at least one non alphanumeric character, one digit ('0'-'9'), one uppercase ('A'-'Z'), one lowercase ('a'-'z'), one special character and Password must be eight characters or longer."}`. |
| OBS-API-03 | Duplicate username → 406 `{"code":"1204","message":"User exists!"}`. |
| OBS-API-04 | Generate Token (valid) → 200 `{token: <JWT>, expires: <ISO date ~7 days ahead>, status: "Success", result: "User authorized successfully."}`. |
| OBS-API-05 | Generate Token (wrong password) → **200** `{token: null, expires: null, status: "Failed", result: "User authorization failed."}`. |
| OBS-API-06 | Authorized with valid credentials → 200 `false` before any token is generated, 200 `true` after. Wrong password or unknown user → 404 `{"code":"1207","message":"User not found!"}`. |
| OBS-API-07 | Get User without a token, or with an invalid bearer token → 401 `{"code":"1200","message":"User not authorized!"}`. No user data is returned. |
| OBS-API-08 | Get User with a valid bearer token → 200 `{"userId": "<uuid>", "username", "books": [...]}`. |
| OBS-API-09 | Book catalog → 200 with 8 books. Each has isbn, title, subTitle, author, publish_date, publisher, pages, description, website. |
| OBS-API-10 | Add Books → 201 `{"books":[{"isbn":"<isbn>"}]}`. Get User then lists the full book object. |
| OBS-API-11 | Delete Book (body {isbn, userId}) → 204, empty body. Get User then shows `books: []`. |
| OBS-API-12 | Delete User → 204, empty body. Get User afterwards with the old token → 401 `{"code":"1207","message":"User not found!"}`. |

## Documentation vs observed discrepancies
| ID | Documented | Observed |
|----|-----------|----------|
| D1 | CreateUserResult.`userId` | Create returns **`userID`**, while Get User returns `userId`, so casing is inconsistent between endpoints. (API-CT-001) |
| D2 | MessageModal.code is a number | code is a **string** ("1300", "1204", "1200", "1207"). (API-CT-002) |
| D3 | GenerateToken failure documented as 400 | Wrong password returns **200** with status "Failed" and token null; HTTP 200 does not mean authentication succeeded. |
| D4 | Authorized 404 = not found | A wrong password for an existing user returns 404 "User not found!", a misleading message. Valid credentials return `false` until a token has been generated. |
| D5 | Add Books 201 returns CollectionOfIsbn `{isbn}` | Returns `{"books":[{"isbn"}]}`. |
| D6 | Delete Book 204 returns UserBooksResult; Delete User 204 returns BooksResult | Both return 204 with an **empty body** (204 has no content by HTTP definition, so the documented bodies are unreachable). |
| D7 | — | A deleted user's Get returns **401** with code 1207 "User not found!", mixing an auth status with a not-found message. |
| D8 | Path `/Account/v1/User/{UUID}`, parameter named `UserId`; security not declared per operation | Naming mismatch; which operations need auth is learned only from responses. |

## Out of scope for this demonstration
- Replacement book (`PUT /BookStore/v1/Books/{ISBN}`), Delete All Books, Get single Book: optional, not designed.
- No rate, load or security testing. Requests are low-volume and use disposable accounts this project creates and deletes.
