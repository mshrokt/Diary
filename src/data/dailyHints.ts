export interface DailyHint {
  target: string; // 記念日名
  question: string; // 日記のヒント・問いかけ
}

const hints: Record<string, DailyHint> = {
  "01-01": { target: "元日", question: "今年、これだけは成し遂げたい！と思うことは何ですか？" },
  "01-15": { target: "いちごの日", question: "最近食べて『美味しい！』と感動したものは何ですか？" },
  "02-03": { target: "節分", question: "自分の中から追い出したい「弱点」や「習慣」はありますか？" },
  "02-14": { target: "バレンタインデー", question: "最近、誰かに感謝の気持ちを伝えたエピソードはありますか？" },
  "03-14": { target: "ホワイトデー / 数学の日", question: "最近、計算通りにいかなかったけれど、結果オーライだったことは？" },
  "04-01": { target: "エイプリルフール", question: "最近ついた「優しい嘘」や、思わず笑った出来事はありますか？" },
  "05-05": { target: "こどもの日", question: "子供の頃の自分に、今の自分を見せたら何て言われると思いますか？" },
  "07-07": { target: "七夕", question: "今、空から降ってきてほしい「チャンス」や「ラッキー」は何ですか？" },
  "08-11": { target: "山の日", question: "最近、自分の目の前に立ちはだかる「壁」をどう乗り越えましたか？" },
  "10-31": { target: "ハロウィン", question: "もし別人に変身できるなら、どんな一日を過ごしてみたいですか？" },
  "12-25": { target: "クリスマス", question: "自分自身へ贈りたい「お疲れ様」のご褒美は何ですか？" },
  "default": { target: "普通の一日", question: "今日、一番心が動いた瞬間を一言で表すなら？" }
};

// 汎用的な問いかけリスト（記念日がない日用）
const generalQuestions = [
  "今日、自分を褒めるとしたらどんなところですか？",
  "今日出会った言葉で、印象に残っているものはありますか？",
  "明日を最高の一日にするために、今夜できる小さな準備は？",
  "最近、新しく始めたことや、挑戦してみたいことはありますか？",
  "今の気分を色に例えるなら、何色ですか？",
  "今日、誰かの役に立てたかな？と思う瞬間はありましたか？",
  "最近「これがあって良かったな」と感謝したモノは何ですか？"
];

export const getDailyHint = (date: Date): DailyHint => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const key = `${month}-${day}`;

  if (hints[key]) {
    return {
      target: hints[key].target,
      question: hints[key].question
    };
  }

  // 記念日がない日は、日付をシードにして汎用リストから選ぶ
  const seed = date.getDate() + date.getMonth();
  const index = seed % generalQuestions.length;
  return {
    target: "", // 「今日という日」を消去するため空にする
    question: generalQuestions[index]
  };
};
