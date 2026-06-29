import { app } from "./app.js";

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`ETCRM API running on http://127.0.0.1:${port}`);
});
