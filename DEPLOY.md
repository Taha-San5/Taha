# دليل النشر المجاني - MoltBot

## المنصات المستخدمة (كلها مجانية)

| المكوّن | المنصة | التكلفة |
|---|---|---|
| Frontend (React) | Vercel | مجاني دائماً |
| Backend (FastAPI) | Render | مجاني (free tier) |
| Database (MongoDB) | MongoDB Atlas | مجاني 512MB |

---

## الخطوة 1 — احفظ الكود على GitHub

1. افتح **Emergent** وابحث عن زرار **"Save to Github"**
2. اتبع الخطوات وسمّي الـ repository مثلاً: `moltbot`
3. بعد ما يتحفظ، هتلاقي الكود على: `github.com/YOUR_USERNAME/moltbot`

---

## الخطوة 2 — MongoDB Atlas (قاعدة البيانات)

1. روح على **https://www.mongodb.com/atlas/database**
2. اعمل حساب مجاني
3. اختار **"Free Shared Cluster (M0)"**
4. في الـ Connection:
   - اختار **"Connect your application"**
   - انسخ الـ connection string بالشكل ده:
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/moltbot_app
   ```
5. احفظ هذا الـ string — هتحتاجه في الخطوة القادمة

---

## الخطوة 3 — Backend على Render

1. روح على **https://render.com** واعمل حساب مجاني
2. اضغط **"New" → "Web Service"**
3. وصّل حساب GitHub واختار repository `moltbot`
4. اختار هذه الإعدادات:
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile`
   - **Region**: اختار أقرب منطقة ليك
5. في قسم **Environment Variables** أضف:
   ```
   MONGO_URL = mongodb+srv://...  (الـ string من Atlas)
   DB_NAME = moltbot_app
   CORS_ORIGINS = https://YOUR_APP.vercel.app
   EMERGENT_API_KEY = sk-emergent-50b980549D8B0E69f9
   EMERGENT_BASE_URL = https://integrations.emergentagent.com/llm
   PORT = 8001
   ```
6. اضغط **"Create Web Service"**
7. انتظر 5-10 دقايق للـ build
8. انسخ الـ URL بتاع الـ backend مثلاً: `https://moltbot-abc123.onrender.com`

---

## الخطوة 4 — Frontend على Vercel

1. روح على **https://vercel.com** واعمل حساب مجاني (عن طريق GitHub أسهل)
2. اضغط **"New Project"**
3. اختار repository `moltbot`
4. في **"Root Directory"** اكتب: `frontend`
5. في قسم **Environment Variables** أضف:
   ```
   REACT_APP_BACKEND_URL = https://moltbot-abc123.onrender.com
   ```
   (ضع هنا الـ URL اللي أخدته من Render)
6. اضغط **"Deploy"**
7. بعد الـ build هتاخد رابط زي: `https://moltbot.vercel.app`

---

## الخطوة 5 — وصّل Frontend بـ Backend

1. ارجع على **Render** → الـ service بتاعك
2. في **Environment Variables** عدّل:
   ```
   CORS_ORIGINS = https://moltbot.vercel.app
   ```
   (ضع هنا الـ URL الفعلي من Vercel)
3. اضغط **"Save Changes"** — هيعمل redeploy تلقائي

---

## ملاحظات مهمة

- **Render free tier**: الـ service بيتوقف بعد 15 دقيقة من عدم الاستخدام وبيرجع تاني أول ما حد يفتح الموقع (بطء 30 ثانية أول مرة)
- **Vercel**: دايماً شغّال بدون أي توقف
- **MongoDB Atlas**: دايماً شغّال

---

## إذا أردت always-on حقيقي (بدون تأخير)

استخدم **Fly.io** بدل Render:
- روح **https://fly.io** واعمل حساب
- ثبّت `flyctl`: `curl -L https://fly.io/install.sh | sh`
- في مجلد المشروع: `flyctl launch`
- Fly.io يدي 3 machines مجانية دايماً شغّالة
