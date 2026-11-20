# NFC POINT

Платформа цифровых страниц для заведений по NFC-карте. Next.js 16 + TypeScript + Tailwind 4 + Supabase.

## Инструкция для Windows (простыми словами)

### 0. Что нужно установить один раз
1. **Node.js (версия LTS)** — скачайте с https://nodejs.org и установите, всё по умолчанию.
2. **Git** — https://git-scm.com/download/win (понадобится для GitHub).
3. Проверка в PowerShell (клавиша Win → набрать `PowerShell` → Enter):
```powershell
node -v
npm -v
git --version
```
Каждая команда должна показать номер версии.

### 1. Распаковать проект
Скачайте `nfc-point.zip`, нажмите правой кнопкой → «Извлечь всё…» в папку, например `C:\Projects\nfc-point`.
Затем в PowerShell:
```powershell
cd C:\Projects\nfc-point
```

### 2. Файл `.env.local` (ключи)
В папке проекта лежит файл `.env.example`. Скопируйте его:
```powershell
Copy-Item .env.example .env.local
notepad .env.local
```
Откроется Блокнот. Заполните:

| Переменная | Что вставить | Где взять |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fhnxrapbpjesvgcqifrq.supabase.co` (уже стоит) | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ваш Publishable key | Supabase → Project Settings → API Keys |
| `SUPABASE_SECRET_KEY` | ваш Secret key | там же (нажмите «Reveal») |
| `NEXT_PUBLIC_SITE_URL` | пока `http://localhost:3000`, после публикации — адрес на Vercel | — |

Сохраните файл (Ctrl+S). **Secret key никому не показывайте и не отправляйте.** Файл `.env.local` не попадает в GitHub (он в `.gitignore`).

### 3. SQL-миграция в Supabase
1. Откройте Supabase → ваш проект `nfcpoint-kz` → **SQL Editor** → **New query**.
2. Сначала (по желанию) посмотрите, что уже есть в базе: раскомментируйте запрос в конце файла миграции или выполните его отдельно.
3. Откройте файл `supabase\migrations\001_nfc_point_additions.sql` в Блокноте, скопируйте всё содержимое, вставьте в SQL Editor и нажмите **Run**.
4. Так же выполните второй файл: `supabase\migrations\002_page_hotspots.sql` (таблица интерактивных зон). Порядок важен: сначала 001, потом 002.

Миграция безопасна: она **ничего не удаляет**, только добавляет недостающие таблицы/колонки (`if not exists`) и создаёт публичное хранилище картинок `page-images`. Её можно запускать повторно.

### 4. Администратор
1. Supabase → **Authentication → Users → Add user → Create new user**: почта `nfc.point.kz@gmail.com`, придумайте пароль, галочка «Auto Confirm User».
2. Убедитесь, что эта почта есть в таблице `admin_users` (Table Editor). Вход разрешён только таким аккаунтам.
3. Рекомендуется выключить публичную регистрацию: Authentication → Sign In / Providers → отключите «Allow new users to sign up».

### 5. Запуск
```powershell
npm install
npm run dev
```
Откройте http://localhost:3000 — попадёте на страницу входа.

Проверка на ошибки (по желанию):
```powershell
npm run typecheck
npm run build
```

### 6. Как пользоваться
1. **Заведения** → «Новое заведение».
2. **NFC-карты** → выберите заведение → «Создать карту». Скопируйте ссылку и запишите её на физическую NFC-карту (любым приложением для записи NFC, тип записи — URL).
3. **Редактор** → загрузите картинку → «Добавить зону» → мышкой обведите область на картинке → в панели справа задайте название (видно только вам) и ссылку → «Сохранить черновик» → «Предпросмотр» → «Опубликовать». Посетитель видит только картинку; зоны невидимы и работают как ссылки.
4. **Аналитика** — просмотры и клики с фильтрами по периодам.

### 7. GitHub
1. Создайте пустой репозиторий на https://github.com/new (имя `nfc-point`, **Private**, без README).
2. В PowerShell, в папке проекта:
```powershell
git init
git add .
git commit -m "NFC POINT: первая версия"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/nfc-point.git
git push -u origin main
```
(Git попросит войти в GitHub в браузере.)

### 8. Vercel
1. https://vercel.com → войдите через GitHub → **Add New… → Project** → выберите `nfc-point` → **Import**.
2. В блоке **Environment Variables** добавьте четыре переменные из `.env.local` (те же имена и значения). `NEXT_PUBLIC_SITE_URL` — адрес вашего сайта, например `https://nfc-point.vercel.app`.
3. Нажмите **Deploy**. Через пару минут сайт готов.
4. Если адрес изменился — поправьте `NEXT_PUBLIC_SITE_URL` в Vercel (Settings → Environment Variables) и сделайте Redeploy.

## Устройство проекта
- `src/app/login` — вход (только администратор).
- `src/app/admin` — панель: Dashboard, заведения, карты, редактор, аналитика, настройки.
- `src/app/c/[token]` — публичная страница карты (без заголовков и логотипов).
- `src/app/api/track` — приём событий `page_view` / `button_click` (лимит частоты, проверка карты, название кнопки берётся из базы).
- `src/proxy.ts` — закрывает `/admin` (в Next.js 16 заменяет middleware).
- `src/lib/auth.ts` — `requireAdmin()` проверяется на сервере в каждой админской странице и действии.
- Все обращения к базе идут с сервера через Secret key; для браузера открыт только Publishable key (используется для входа и загрузки картинки по одноразовой ссылке).
- Зоны (таблица `page_hotspots`) хранят координаты и размеры в процентах от изображения; опубликованная версия хранится отдельно от черновика (`page_hotspots.version`).

## Приватность
Уникальные посетители считаются по случайному идентификатору в браузере (срок 90 дней). IP-адреса и геолокация в базу не записываются.
