import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { CONTACTAR_DURATION, CONTACTAR_FPS, Contactanos } from "./Contactar/Contactanos";
import { INTRIGA_DURATION, INTRIGA_FPS, TresCosas } from "./Intriga/TresCosas";
import { IDEAS_DURATION, IDEAS_FPS, VideoIdeas } from "./Ideas/VideoIdeas";
import { UN_DURATION, UN_FPS, UN_H, UN_W, Unidades } from "./Unidades/Unidades";
import { CONS_DURATION, CONS_FPS, CONS_H, CONS_W, Constructora } from "./Constructora/Constructora";
import { AMEN_DURATION, AMEN_FPS, AMEN_H, AMEN_W, Amenities } from "./Amenities/Amenities";
import { ESQ_DURATION, ESQ_FPS, EsquemaPlusvalia } from "./Casa/EsquemaPlusvalia";
import { CASA_DURATION, CASA_FPS, CasaPlusvalia } from "./Casa/CasaPlusvalia";
import { CalleRail, RAIL_DURATION, RAIL_FPS } from "./Calle/CalleRail";
import { CALLE_DURATION, CALLE_FPS, CalleDorada } from "./Calle/CalleDorada";
import { EDIT_DURATION, EDIT_FPS, EsquemaPip } from "./Edit/EsquemaPip";
import { KitDemo } from "./KitDemo/KitDemo";
import { TOUR_DURATION, TOUR_FPS, TourApto } from "./Tour/TourApto";
import { UNIDAD_DURATION, UNIDAD_FPS, UnidadFlotante } from "./Unidad/UnidadFlotante";
import tipo101 from "./Unidad/units/tipo101";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <Composition
        id="KitDemo"
        component={KitDemo}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="EsquemaPip"
        component={EsquemaPip}
        durationInFrames={EDIT_DURATION}
        fps={EDIT_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="CalleDorada"
        component={CalleDorada}
        durationInFrames={CALLE_DURATION}
        fps={CALLE_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="CalleRail"
        component={CalleRail}
        durationInFrames={RAIL_DURATION}
        fps={RAIL_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="CasaPlusvalia"
        component={CasaPlusvalia}
        durationInFrames={CASA_DURATION}
        fps={CASA_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="TresCosas"
        component={TresCosas}
        durationInFrames={INTRIGA_DURATION}
        fps={INTRIGA_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="Contactanos"
        component={Contactanos}
        durationInFrames={CONTACTAR_DURATION}
        fps={CONTACTAR_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="EsquemaPlusvalia"
        component={EsquemaPlusvalia}
        durationInFrames={ESQ_DURATION}
        fps={ESQ_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="VideoIdeas"
        component={VideoIdeas}
        durationInFrames={IDEAS_DURATION}
        fps={IDEAS_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="Unidades"
        component={Unidades}
        durationInFrames={UN_DURATION}
        fps={UN_FPS}
        width={UN_W}
        height={UN_H}
      />
      <Composition
        id="Constructora"
        component={Constructora}
        durationInFrames={CONS_DURATION}
        fps={CONS_FPS}
        width={CONS_W}
        height={CONS_H}
      />
      <Composition
        id="Amenities"
        component={Amenities}
        durationInFrames={AMEN_DURATION}
        fps={AMEN_FPS}
        width={AMEN_W}
        height={AMEN_H}
      />
      <Composition
        id="TourApto"
        component={TourApto}
        durationInFrames={TOUR_DURATION}
        fps={TOUR_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="UnidadFlotante"
        component={UnidadFlotante}
        defaultProps={{ config: tipo101 }}
        durationInFrames={UNIDAD_DURATION}
        fps={UNIDAD_FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
