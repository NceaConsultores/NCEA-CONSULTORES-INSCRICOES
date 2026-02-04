const SHEET_NAME = "Sheet1"; // se a sua folha tiver outro nome, troque aqui
const SECRET = "NCEA_2026_SECRETO"; // troque por uma chave sua (não publique)

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return json_(404, { ok:false, message:"Folha não encontrada. Verifique SHEET_NAME." });

    const body = JSON.parse(e.postData.contents || "{}");

    // Pequena segurança (token)
    if (!body.secret || body.secret !== SECRET) {
      return json_(401, { ok:false, message:"Não autorizado." });
    }

    // Validação básica
    const required = ["id","createdAt","course","fullname","phone","district"];
    for (const k of required) {
      if (!body[k] || String(body[k]).trim() === "") {
        return json_(400, { ok:false, message:`Campo obrigatório em falta: ${k}` });
      }
    }

    const row = [
      body.id,
      body.createdAt,
      body.course,
      body.fullname,
      body.phone,
      body.email || "",
      body.district,
      body.occupation || "",
      body.note || "",
      body.source || "github-pages"
    ];

    sheet.appendRow(row);

    return json_(200, { ok:true, message:"Inscrição registada com sucesso." });

  } catch (err) {
    return json_(500, { ok:false, message:"Erro interno.", detail:String(err) });
  }
}

function doGet() {
  // útil para testar se está online
  return json_(200, { ok:true, message:"API de inscrições activa." });
}

function json_(code, obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
