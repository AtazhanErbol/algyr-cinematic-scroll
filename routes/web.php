<?php

use Illuminate\Support\Facades\Route;

Route::view('/', 'demo')->name('algyr.demo');
Route::view('/demo', 'demo');
