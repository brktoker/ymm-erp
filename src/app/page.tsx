// Kök → panele yönlendir (giriş yoksa middleware /giris'e atar).
import { redirect } from 'next/navigation'

export default function Home() {
    redirect('/panel')
}
