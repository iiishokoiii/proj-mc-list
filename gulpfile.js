//gulp.〇〇の処理は全部定数でまとめる
const {
  src,
  dest,
  watch,
  lastRun,
  series,
  parallel
} = require("gulp");
const del = require('del');
 
// html
const htmlMin = require("gulp-htmlmin");
 
// Sass
const sass = require("gulp-dart-sass");
const notify = require("gulp-notify");
const plumber = require("gulp-plumber");
const postCss = require("gulp-postcss"); //for autoprefixer
const autoprefixer = require("autoprefixer");
const gcmq = require("gulp-group-css-media-queries");
 
// JavaScript
const babel = require("gulp-babel");
const uglify = require("gulp-uglify");
 
// 画像圧縮
const imagemin = require("gulp-imagemin");
const imageminMozjpeg = require("imagemin-mozjpeg");
const imageminPngquant = require("imagemin-pngquant");
const imageminGifsicle = require("imagemin-gifsicle");
const imageminSvgo = require("imagemin-svgo");
// const tinyping = require("gulp-tinypng-compress");
 
// ブラウザ同期
const browserSync = require("browser-sync").create();
 
//パス設定
const paths = {
  html: {
    src: "./src/**/*.html",
    dist: "./dist/",
  },
  styles: {
    src: "./src/sass/**/*.scss",
    dist: "./dist/css/",
    map: "./map",
  },
  scripts: {
    src: "./src/js/**/*.js",
    dist: "./dist/js/",
  },
  images: {
    src: "./src/img/**/*.{jpg,jpeg,png,gif,svg}",
    dist: "./dist/img/",
  },
};

// init
const initialize = () => {
  return del([
    paths.html.dist,
    paths.scripts.dist,
    paths.images.dist
  ]);
}
 
// htmlフォーマット
const htmlFormat = () => {
  return src(paths.html.src)
    .pipe(
      plumber({
        //エラーがあっても処理を止めない
        errorHandler: notify.onError("Error: <%= error.message %>"),
      })
    )
    // .pipe(
    //   htmlMin({
    //     //HTMLの圧縮
    //     removeComments: true, //コメントを削除
    //     collapseWhitespace: true, //余白を詰める
    //     preserveLineBreaks: true, //タグ間の改行を詰める
    //     removeEmptyAttributes: false //空属性を削除しない
    //   })
    // )
    .pipe(dest(paths.html.dist));
};
 
// Sassコンパイル
const sassCompile = () => {
  return src(paths.styles.src, {
      sourcemaps: true,
    })
    .pipe(
      plumber({
        errorHandler: notify.onError("Error: <%= error.message %>"),
      })
    )
    .pipe(
      sass({
        outputStyle: "expanded",
      }).on("error", sass.logError)
    )
    .pipe(
      postCss([
        autoprefixer({
          // プロパティのインデントを整形しない
          cascade: false,
          // IE11のgrid対応
          grid: "autoplace",
        }),
      ])
    )
    //メディアクエリをまとめる
    .pipe(gcmq())
    .pipe(
      dest(paths.styles.dist, {
        sourcemaps: "./map",
      })
    )
    // 変更があったらリロードせずにCSSのみ更新
    .pipe(browserSync.stream())
};
 
// JavaScriptコンパイル
const jsBabel = () => {
  return src(paths.scripts.src)
    .pipe(
      plumber({
        errorHandler: notify.onError("Error: <%= error.message %>"),
      })
    )
    .pipe(
      // Babel変換
      babel({
        presets: ["@babel/preset-env"],
      })
    )
    .pipe(dest(paths.scripts.dist))
    // JS圧縮
    .pipe(uglify())
    .pipe(dest(paths.scripts.dist));
};
 
// 画像圧縮
const imagesCompress = () => {
  return src(paths.images.src, {
      // 更新があった場合に処理
      since: lastRun(imagesCompress),
    })
    .pipe(
      plumber({
        errorHandler: notify.onError("Error: <%= error.message %>"),
      })
    )
    .pipe(
      imagemin(
        [
          // JPG
          imageminMozjpeg({
            quality: 80,
          }),
          // PNG
          imageminPngquant(
            [0.7, 0.8] //画質の最小,最大
          ),
          // GIF
          imageminGifsicle(),
          // SVG
          imageminSvgo({
            plugins: [{
                //フォトショやイラレで書きだされるviewboxを消さない
                removeViewbox: false,
              },
              {
                // メタデータを削除する
                removeMetadata: true,
              },
              {
                // 不明な要素や属性を削除する
                removeUnknownsAndDefaults: true,
              },
              {
                // <path>に変換しない
                convertShapeToPath: false,
              }
            ],
          }),
        ], {
          //ターミナルへの情報出力非表示
          verbose: true,
        }
      )
    )
    .pipe(dest(paths.images.dist));
};

// ローカルサーバー起動(dist)
const browserSyncFunc = (done) => {
  browserSync.init({
    //デフォルトのconnectedのメッセージ非表示
    notify: false,
    server: {
      baseDir: "./dist",
    },
    startPath: "./index.html",
    reloadOnRestart: true,
  });
  done();
};
 
// ブラウザ自動リロード
const browserReloadFunc = (done) => {
  browserSync.reload();
  done();
};
 
// ファイル監視
const watchFiles = () => {
  watch(paths.html.src, series(htmlFormat, browserReloadFunc));
  watch(paths.styles.src, series(sassCompile));
  watch(paths.scripts.src, series(jsBabel, browserReloadFunc));
  watch(paths.images.src, series(imagesCompress, browserReloadFunc));
};
 
// npx gulp実行処理
exports.default = series(
  initialize,
  parallel(htmlFormat, sassCompile, jsBabel, imagesCompress),
  parallel(watchFiles, browserSyncFunc)
);

exports.build = series(
  initialize,
  parallel(htmlFormat, sassCompile, jsBabel, imagesCompress),
);