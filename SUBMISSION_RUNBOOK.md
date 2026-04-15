# Submission Runbook (Staged Rollout)

## 1) Pre-submit
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `RELEASE_QA_CHECKLIST.md` completed
- [ ] `DEVICE_BETA_RUNBOOK.md` completed
- [ ] Store listing text and screenshots finalized
- [ ] Privacy policy URL published

## 2) Production Builds
- Android: `npm run build:prod:android`
- iOS: `npm run build:prod:ios`

## 3) Submit

### Android — Google Play service account (required)
Play Console, EAS’in AAB yüklemesi için bir **Google Cloud service account JSON** anahtarı ister.

1. Rehber: [expo.fyi/creating-google-service-account](https://expo.fyi/creating-google-service-account)
2. Google Cloud’da service account oluştur, JSON key indir.
3. Play Console → **Setup → API access** ile hesabı bağla ve uygulamaya **Release** (veya tam yetki) ver.
4. JSON dosyasını repoda **asla commit etme**. Öneri: `credentials/play-service-account.json` (klasör `.gitignore`’da).
5. Submit sırasında sorulunca **tam yol** ver, örn.  
   `C:\apps\split-trip\credentials\play-service-account.json`  
   veya `C:\Users\...\Downloads\api-....json`

**Not:** Bu anahtar yalnızca Play yükleme içindir; uygulamanızda FCM/push yoksa bildirim kısmını yok sayabilirsiniz.

### iOS — App Store Connect API key (.p8)
Submit sırasında **App Store Connect API Key** (`.p8`) gerekir. EAS’in “Generate new key” seçeneği bazen Apple tarafında **Internal Server Error** verir; geçici olabilir.

**Seçenek A — Tekrar dene (birkaç saat sonra veya farklı gün)**  
`npm run submit:ios` → “Generate a new App Store Connect API Key?” → **yes**

**Seçenek B — Manuel anahtar (önerilen, stabil)**  
1. [App Store Connect](https://appstoreconnect.apple.com) → **Users and Access** → **Integrations** → **App Store Connect API** → **Generate** (Admin yetkisi gerekir).  
2. **Key ID**, **Issuer ID** ve indirilen **`AuthKey_XXXXXX.p8`** dosyasını sakla (`.p8` yalnızca bir kez indirilir).  
3. Dosyayı güvenli bir yere koy (örn. `credentials\AuthKey_XXXXXX.p8`, klasör commit edilmez).  
4. Submit tekrar:  
   `npm run submit:ios`  
   - “Generate new key?” → **no**  
   - **Path to App Store Connect API Key:** → `.p8` dosyasının **tam yolu**  
   - İstenirse **Key ID** ve **Issuer ID** gir (CLI sorarsa).

İsteğe bağlı: `eas.json` içinde `submit.production` altına `ios.ascApiKeyPath`, `ascApiKeyId`, `ascApiKeyIssuerId` yazarak her seferinde sormayı azaltabilirsin (değerleri repoya koyma).

- Android: `npm run submit:android`
- iOS: `npm run submit:ios`

## 4) Rollout Strategy
### Google Play
- Start staged rollout at low percentage.
- Monitor crash rate, ANR, and user feedback.
- Increase rollout only if stable.

### App Store
- Use phased release after approval.
- Pause rollout if blocker appears.

## 5) Rollback / Hotfix
- Stop rollout/phased release.
- Create hotfix branch.
- Bump versions.
- Build + submit patch release.
