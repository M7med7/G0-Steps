import type { DeviceLayerId, DevicePartId } from '../models/deviceLayers';
import type { Bilingual } from './translate';

/* Copy for the 3D station page (device.html). Staff-facing, so Arabic and English only. */

export const DEVICE_UI = {
  pageTitle: { ar: 'مكونات محطة الفحص', en: 'Inside the screening station' },
  overviewLede: {
    ar: 'اختر طبقة لتقترب الكاميرا منها وتعرض تفاصيلها.',
    en: 'Pick a layer and the camera moves in so you can see its details.',
  },
  layerCount: { ar: 'الطبقة {n} من {total}', en: 'Layer {n} of {total}' },
  layerList: { ar: 'طبقات المحطة', en: 'Station layers' },
  partsTitle: { ar: 'المكونات', en: 'Parts' },
  backToAll: { ar: 'كل الطبقات', en: 'All layers' },
  previous: { ar: 'الطبقة الأعلى', en: 'Layer above' },
  next: { ar: 'الطبقة الأسفل', en: 'Layer below' },
  explode: { ar: 'فكّ الطبقات', en: 'Explode' },
  assemble: { ar: 'تجميع', en: 'Assemble' },
  openApp: { ar: 'تطبيق الفحص', en: 'Screening app' },
  language: { ar: 'English', en: 'العربية' },
  hint: {
    ar: 'اسحب للتدوير · مرّر للتكبير · اضغط على طبقة',
    en: 'Drag to rotate · scroll to zoom · tap a layer',
  },
  keysHint: { ar: 'الأسهم للتنقل بين الطبقات، و Esc للعودة', en: 'Arrow keys move between layers, Esc goes back' },
  notToScale: {
    ar: 'نموذج توضيحي ثلاثي الأبعاد مبني على تصور الفريق، وليس بمقاس حقيقي.',
    en: "Illustrative 3D model based on the team's concept render. Not to scale.",
  },
  loading: { ar: 'جارٍ تحميل النموذج ثلاثي الأبعاد…', en: 'Loading the 3D model…' },
  noWebgl: {
    ar: 'هذا المتصفح لا يدعم WebGL، لذلك لا يمكن عرض النموذج ثلاثي الأبعاد.',
    en: "This browser doesn't support WebGL, so the 3D model can't be shown.",
  },
} as const satisfies Record<string, Bilingual>;

export interface DeviceLayerCopy {
  readonly name: Bilingual;
  readonly detail: Bilingual;
}

export const DEVICE_LAYER_COPY: Readonly<Record<DeviceLayerId, DeviceLayerCopy>> = {
  topGlass: {
    name: { ar: 'سطح شفاف', en: 'Transparent top' },
    detail: {
      ar: 'السطح الذي يقف عليه الحاج. ترشده علامتا القدمين إلى مكان كل قدم، وترى الكاميرات باطن القدم من خلاله.',
      en: 'The surface the pilgrim stands on. Two foot outlines show where each foot goes, and the cameras see the soles through it.',
    },
  },
  cameras: {
    name: { ar: 'طبقة الكاميرات', en: 'Camera layer' },
    detail: {
      ar: 'إطار معدني يحمل كاميرا حرارية (MLX) وكاميرا ESP32 موجّهتين نحو باطن القدم. غير متصلتين في النموذج الحالي.',
      en: 'A metal tray holding a thermal camera (MLX) and an ESP32 camera, both facing up at the soles. Not connected in the prototype yet.',
    },
  },
  insulation: {
    name: { ar: 'سطح عازل', en: 'Insulating layer' },
    detail: {
      ar: 'لوح مثقّب يفصل طبقة الكاميرات عن الدائرة الكهربائية أسفله.',
      en: 'A perforated plate that separates the camera layer from the circuit board below.',
    },
  },
  circuit: {
    name: { ar: 'الدائرة الكهربائية', en: 'Circuit board' },
    detail: {
      ar: 'يقرأ متحكم ESP32-S3 المستشعرات ويرسل القراءات إلى الشاشة، وتزوّد البطاريات المحطة بالطاقة.',
      en: 'An ESP32-S3 microcontroller reads the sensors and sends the readings to the screen. The battery pack powers the station.',
    },
  },
  innerFrame: {
    name: { ar: 'هيكل داخلي', en: 'Inner frame' },
    detail: {
      ar: 'حاضنة تثبّت الدائرة الكهربائية والطبقات التي فوقها في مكانها.',
      en: 'A tray that holds the circuit board and the layers above it in place.',
    },
  },
  supports: {
    name: { ar: 'دعامات', en: 'Supports' },
    detail: {
      ar: 'شبكة صلبة تنقل وزن الحاج إلى مستشعرات الضغط بالتساوي.',
      en: "A rigid grid that carries the pilgrim's weight evenly down to the pressure sensors.",
    },
  },
  pressureSensors: {
    name: { ar: 'مستشعرات الضغط', en: 'Pressure sensors' },
    detail: {
      ar: '8 مستشعرات FSR402، أربعة تحت كل قدم: إبهام القدم، ومقدمة القدم الداخلية والخارجية، والكعب.',
      en: '8 FSR402 sensors, 4 under each foot: big toe, inner forefoot, outer forefoot and heel.',
    },
  },
  outerShell: {
    name: { ar: 'هيكل خارجي', en: 'Outer shell' },
    detail: {
      ar: 'مصنوع من بلاستيك ABS، وهو مادة عازلة ومقاومة للظروف الخارجية.',
      en: 'Made of ABS plastic, an insulating material that stands up to outdoor conditions.',
    },
  },
};

export const DEVICE_PART_COPY: Readonly<Record<DevicePartId, DeviceLayerCopy>> = {
  mlxCamera: {
    name: { ar: 'كاميرا MLX', en: 'MLX camera' },
    detail: {
      ar: 'كاميرا حرارية تقيس حرارة باطن القدم لتحديد المناطق الأدفأ من غيرها.',
      en: 'A thermal camera that measures sole temperature to find areas warmer than the rest.',
    },
  },
  esp32Camera: {
    name: { ar: 'كاميرا ESP-32', en: 'ESP32 camera' },
    detail: {
      ar: 'كاميرا ملونة صغيرة تلتقط صورة لباطن القدم.',
      en: 'A small colour camera that takes a picture of the sole.',
    },
  },
};
