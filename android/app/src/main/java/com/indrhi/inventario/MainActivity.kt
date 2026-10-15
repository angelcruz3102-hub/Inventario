package com.indrhi.inventario

import android.Manifest
import android.content.ContentValues
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val URL_WEB = "https://TU-USUARIO.github.io/TU-REPO/index.html" // ← CAMBIA ESTO

    companion object {
        private const val REQUEST_WRITE_STORAGE = 100
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE),
                    REQUEST_WRITE_STORAGE
                )
            }
        }

        webView = findViewById(R.id.webView)
        configurarWebView()
    }

    private fun configurarWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            loadWithOverviewMode = true
            useWideViewPort = true
            builtInZoomControls = false
            displayZoomControls = false
        }

        webView.webViewClient = WebViewClient()
        webView.addJavascriptInterface(AndroidExport(), "AndroidExport")
        webView.loadUrl(URL_WEB)
    }

    inner class AndroidExport {
        @JavascriptInterface
        fun guardarExcelEnTelefono(base64: String, nombreArchivo: String) {
            try {
                val bytes = Base64.decode(base64, Base64.DEFAULT)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    guardarConMediaStore(bytes, nombreArchivo)
                } else {
                    guardarDirecto(bytes, nombreArchivo)
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread {
                    Toast.makeText(
                        this@MainActivity,
                        "Error al guardar: ${e.message}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }

        private fun guardarConMediaStore(bytes: ByteArray, nombreArchivo: String) {
            val resolver = contentResolver
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, nombreArchivo)
                put(MediaStore.MediaColumns.MIME_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/INDRHI")
            }
            val uri: Uri? = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
            uri?.let {
                val outputStream: OutputStream? = resolver.openOutputStream(it)
                outputStream?.use { stream ->
                    stream.write(bytes)
                    stream.flush()
                }
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "✅ Excel guardado en Descargas/INDRHI", Toast.LENGTH_LONG).show()
                }
            } ?: run {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "No se pudo crear el archivo", Toast.LENGTH_LONG).show()
                }
            }
        }

        private fun guardarDirecto(bytes: ByteArray, nombreArchivo: String) {
            try {
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                val indrhiDir = File(downloadsDir, "INDRHI")
                if (!indrhiDir.exists()) indrhiDir.mkdirs()
                val archivo = File(indrhiDir, nombreArchivo)
                FileOutputStream(archivo).use { stream ->
                    stream.write(bytes)
                    stream.flush()
                }
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "✅ Excel guardado en Descargas/INDRHI", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                e.printStackTrace()
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_WRITE_STORAGE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this, "Permiso concedido", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "Se necesita permiso para guardar Excel", Toast.LENGTH_LONG).show()
            }
        }
    }
}
