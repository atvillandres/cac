# CAC Enterprise UI — APLN *P.GLW flow

Concept UI for the **Java** runtime (`modern/cacentrp-java`):

1. ODBC login (CACDB / APMODDTA / RAWDATA)
2. Prepare APLN CURRLEDGE
3. Generate `*P.GLW` into `C:\CACENT~~1\GLWALKER\`
4. **Copy to `I:\adhoc`** and **move** source into `GLWALKER\backup_yyyyMMdd\`

Dark/light theme toggle (top-right). Sample data only in the browser; production path is the JAR.

```bash
cd apps/cac-enterprise-ui
python3 -m http.server 8765 --bind 127.0.0.1
```

Java commands:

```bash
java -jar modern/cacentrp-java/target/cacentrp.jar --variant AP --db odbc --user U --password P
java -jar modern/cacentrp-java/target/cacentrp.jar daily pglw --seed-ledger --out "C:\CACENT~~1\GLWALKER"
java -jar modern/cacentrp-java/target/cacentrp.jar daily publish --glwalker "C:\CACENT~~1\GLWALKER" --adhoc "I:\adhoc"
```
