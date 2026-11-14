// 배너 코드 안내 (관리 화면용 — 화면에서도 불러오므로 서버 전용 도구를 쓰지 않아요)

/** 관리 화면 "코드" 창에 보여줄 예시 */
export const SAMPLE_CODE = `<section data-jd-group class="my-banners">
  <h2 data-jd-group-title></h2>
  <div data-jd-item class="my-banner">
    <a data-jd-link>{{image}}</a>
    <p style="{{text1.style}}">{{text1}}</p>
    <ul>
      <li data-jd-product class="{{p.soldout}}">
        <a href="{{p.url}}">{{p.image}} {{p.name}} {{p.price}}</a>
      </li>
    </ul>
  </div>
</section>`

/** 관리 화면 "코드" 창에 보여줄 변수 안내 */
export const VARIABLE_GUIDE: [string, string][] = [
  ['data-jd-group', '그룹 전체를 감싸는 틀 (선택)'],
  ['data-jd-group-title', '이 칸 안에 그룹 이름을 넣어 줘요'],
  ['data-jd-item', '배너 한 장의 틀 — 배너 수만큼 반복 (필수)'],
  ['data-jd-link', 'a 태그에 달면 링크 주소·새창이 자동으로 들어가고, 링크가 비면 a 만 빠져요'],
  ['data-jd-product', '연결한 상품 수만큼 반복'],
  ['{{url}} / {{target}}', '링크 주소 / _self·_blank'],
  ['{{image}} / {{image_url}}', 'PC 이미지(태그) / 주소'],
  ['{{mobile_image}} / {{mobile_image_url}}', '모바일 이미지(태그) / 주소 — 비면 PC 이미지'],
  ['{{alt}}', '이미지 설명'],
  ['{{text1}} ~ {{text10}}', '텍스트 (<b> 굵게 가능)'],
  ['{{text1.style}} / {{text1.mstyle}}', 'PC / 모바일 글자 꾸밈 한 번에 (크기·색·굵기)'],
  ['{{text1.size}} / {{text1.msize}}', 'PC / 모바일 글자 크기 (예: 14px)'],
  ['{{text1.color}} / {{text1.bold}}', '글자색 / 굵게면 "bold"'],
  ['{{text1.vars}}', 'CSS 변수 --jd-size, --jd-msize, --jd-color, --jd-weight'],
  ['{{color1}} ~ {{color4}}', '색상 1~4'],
  ['{{html}}', 'HTML 칸 내용'],
  ['{{extra1}} ~ {{extra5}} / {{extra1.url}}', '추가이미지 (태그 / 주소)'],
  ['{{no}} / {{index}}', '배너 순번 (1부터 / 0부터)'],
  ['{{group}}', '그룹 이름'],
  ['{{p.name}} / {{p.url}} / {{p.no}}', '상품명 / 상세 주소 / 상품번호'],
  ['{{p.image}} / {{p.image_url}}', '상품 사진(태그) / 주소'],
  ['{{p.price}}', '판매가 (0원이면 "가격협의")'],
  ['{{p.list_price}} / {{p.discount}}', '정가 / 할인율 (예: 25%) — 없으면 빈칸'],
  ['{{p.soldout}} / {{p.soldout_badge}}', '품절이면 클래스 "jd-soldout" / "품절" 표시'],
  ['{{p.summary}} / {{p.spec}}', '짧은 설명 / 주요 사양'],
  ['{{p.order}}', '상품 순번 (1부터)'],
]
