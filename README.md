# Survive Online (ทีวี + มือถือ)

เกม Survive: Escape from Atlantis เวอร์ชันออนไลน์ ใช้จอทีวี/คอมเป็นกระดาน และมือถือเป็นตัวควบคุม (เหมือน Timeline)

## ขึ้นระบบ (ครั้งแรก)
1. สร้าง repo ใหม่บน GitHub ชื่อ `survive-online` (Private) แล้วอัปโหลดโค้ดชุดนี้
2. Vercel > Add New Project > เลือก repo นี้ > Deploy
3. ผูก Redis: Vercel > โปรเจกต์ใหม่ > Storage > เชื่อมฐานข้อมูล Upstash ตัวเดิมที่ใช้กับ Timeline ได้เลย
   (คีย์ในฐานข้อมูลขึ้นต้นด้วย `sv:` ไม่ชนกับ Timeline) แล้วกด Redeploy

## ทดสอบในเครื่อง
```
npm install
npm run dev        # http://localhost:3000 (ไม่ต้องมี Redis ถ้าไม่ใช่ production)
npm run simulate   # จำลองเกมสุ่ม
node scripts/test-rules.mjs
```

## ปรับตัวเลข/กติกา
แก้ที่ `lib/config.js` (จำนวนกระเบื้อง ใต้กระเบื้อง ค่าตัวคน เวลาป้องกัน ฯลฯ)
กติกาละเอียดดูที่ `RULES-SPEC.md`
