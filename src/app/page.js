import Image from "next/image";
import styles from "./page.module.css";
import { Pseudo3D } from "./components/Pseudo3D";
 

export default function Home() {
  return (
    <main className={styles.main}>
      <Pseudo3D />
    </main>
  );
}
