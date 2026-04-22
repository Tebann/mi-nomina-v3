// src/pages/Usuario.jsx
import React, { useEffect, useState } from "react";

export default function Usuario({ user, onSave, onCancel }) {
  const [profile, setProfile] = useState(user?.profile || {});

  useEffect(()=> { setProfile(user?.profile || {}); }, [user]);

  function handleFile(e){
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfile(p => ({ ...p, signatureDataUrl: reader.result }));
    reader.readAsDataURL(file);
  }

  function handleSave(){
    if(!profile.fullName) return alert("Ingresa el nombre completo");
    onSave(profile);
  }

  return (
    <div className="app-shell min-h-screen bg-transparent p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Perfil de Usuario</h2>
          <div className="text-sm opacity-70">Los datos se usarán en la cuenta de cobro</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Empresa (izquierda) */}
          <div className="space-y-4">
            <div className="text-lg font-semibold">Empresa / Cliente</div>
            <label className="block">
              <div className="text-sm mb-1">Empresa</div>
              <input type="text" value={profile.empresa || ""} onChange={e=> setProfile({...profile, empresa: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </label>
            <label className="block">
              <div className="text-sm mb-1">NIT</div>
              <input type="text" value={profile.nit || ""} onChange={e=> setProfile({...profile, nit: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </label>
            <label className="block">
              <div className="text-sm mb-1">Ciudad</div>
              <input type="text" value={profile.ciudad || "Pereira"} onChange={e=> setProfile({...profile, ciudad: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </label>
          </div>

          {/* Empleado (derecha) */}
          <div className="space-y-4">
            <div className="text-lg font-semibold">Empleado</div>
            <label className="block">
              <div className="text-sm mb-1">Nombre completo</div>
              <input type="text" value={profile.fullName || ""} onChange={e=> setProfile({...profile, fullName: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </label>
            <label className="block">
              <div className="text-sm mb-1">Cédula</div>
              <input type="text" value={profile.cedula || ""} onChange={e=> setProfile({...profile, cedula: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </label>
            <label className="block">
              <div className="text-sm mb-1">Correo</div>
              <input type="email" value={profile.correo || ""} onChange={e=> setProfile({...profile, correo: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </label>

            <label className="block">
              <div className="text-sm mb-1">Concepto por defecto</div>
              <input type="text" value={profile.concepto || ""} onChange={e=> setProfile({...profile, concepto: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </label>

            <label className="block">
              <div className="text-sm mb-1">Firma (PNG o JPG)</div>
              <input type="file" accept="image/*" onChange={handleFile} />
              {profile.signatureDataUrl && (
                <div className="mt-2 flex items-center gap-3">
                  <img src={profile.signatureDataUrl} alt="firma" className="h-20 object-contain border p-1 bg-white" />
                  <button className="text-sm px-3 py-1 rounded-lg border" onClick={()=> setProfile({...profile, signatureDataUrl: ""})}>Eliminar firma</button>
                </div>
              )}
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} className="flex-1 bg-slate-900 text-white rounded-xl py-3 font-semibold">Guardar perfil</button>
          <button onClick={onCancel} className="flex-1 rounded-xl border py-3 font-semibold">Volver</button>
        </div>
      </div>
    </div>
  );
}
